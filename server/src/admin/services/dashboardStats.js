import BookingOrder from '../../models/BookingOrder.js';
import Event from '../../models/Event.js';
import User from '../../models/User.js';
import GlobalSetting from '../../models/GlobalSetting.js';
import { cacheGet, cacheSet } from '../../services/cacheService.js';

const DAY = 24 * 60 * 60 * 1000;
const CACHE_TTL_SECONDS = 120;
const MAX_RANGE_DAYS = 366;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse ?from&to (YYYY-MM-DD = whole UTC days, or full ISO timestamps).
 * Defaults to the last 30 UTC days including today. Daily series buckets are UTC too.
 */
export function resolveRange({ from, to } = {}) {
    const end = to ? new Date(to) : new Date();
    if (!to || DATE_ONLY.test(to)) end.setUTCHours(23, 59, 59, 999);
    const start = from ? new Date(from) : new Date(end.getTime() - 29 * DAY);
    if (!from || DATE_ONLY.test(from)) start.setUTCHours(0, 0, 0, 0);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw Object.assign(new Error('Invalid date range'), { statusCode: 422 });
    }
    if ((end - start) / DAY > MAX_RANGE_DAYS) {
        throw Object.assign(new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`), { statusCode: 422 });
    }
    return { start, end };
}

function dayKeys(start, end) {
    const keys = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    while (cursor <= end) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return keys;
}

async function platformFeePercent() {
    const setting = await GlobalSetting.findOne({ country: 'India' }).lean() || await GlobalSetting.findOne().lean();
    return Number(setting?.serviceFeePercent ?? 5);
}

async function compute(start, end) {
    const range = { $gte: start, $lte: end };
    const now = new Date();
    const [paidAgg, dailyOrders, failedPayments, newUsers, dailyUsers, activeEvents, pendingEvents, feePct] = await Promise.all([
        BookingOrder.aggregate([
            { $match: { status: 'paid', createdAt: range } },
            { $project: { total: 1, qty: { $sum: '$items.quantity' } } },
            { $group: { _id: null, gross: { $sum: '$total' }, tickets: { $sum: '$qty' }, orders: { $sum: 1 } } }
        ]),
        BookingOrder.aggregate([
            { $match: { status: 'paid', createdAt: range } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                gross: { $sum: '$total' },
                tickets: { $sum: { $sum: '$items.quantity' } }
            } }
        ]),
        BookingOrder.countDocuments({ status: 'cancelled', createdAt: range }),
        User.countDocuments({ createdAt: range }),
        User.aggregate([
            { $match: { createdAt: range } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
        ]),
        Event.countDocuments({
            status: { $in: ['published', 'sold-out'] },
            $or: [{ endsAt: { $gte: now } }, { endsAt: null, startsAt: { $gte: now } }]
        }),
        Event.countDocuments({ status: 'review_pending' }),
        platformFeePercent()
    ]);

    const totals = paidAgg[0] || { gross: 0, tickets: 0, orders: 0 };
    const ordersByDay = new Map(dailyOrders.map((row) => [row._id, row]));
    const usersByDay = new Map(dailyUsers.map((row) => [row._id, row.count]));
    const fee = (gross) => Math.round(gross * feePct) / 100;

    return {
        range: { from: start.toISOString(), to: end.toISOString() },
        totals: {
            gross_sales: totals.gross,
            platform_fees: fee(totals.gross),
            net_to_organizers: totals.gross - fee(totals.gross),
            paid_orders: totals.orders,
            tickets_sold: totals.tickets,
            active_events: activeEvents,
            pending_events: pendingEvents,
            new_users: newUsers,
            failed_payments: failedPayments,
            // Fraud detection isn't modelled yet — reported as not tracked rather than a fake 0.
            fraud_alerts: null
        },
        platform_fee_percent: feePct,
        series: dayKeys(start, end).map((day) => {
            const row = ordersByDay.get(day);
            return {
                date: day,
                gross_sales: row?.gross || 0,
                platform_fees: fee(row?.gross || 0),
                tickets_sold: row?.tickets || 0,
                new_users: usersByDay.get(day) || 0
            };
        }),
        generated_at: new Date().toISOString()
    };
}

/** Redis-cached (2 min) per range. Pass refresh=true to bypass the cache. */
export async function dashboardStats(query = {}, { refresh = false } = {}) {
    const { start, end } = resolveRange(query);
    const key = `admin:dashboard:${start.toISOString()}:${end.toISOString()}`;
    if (!refresh) {
        const cached = await cacheGet(key);
        if (cached) return { ...cached, cached: true };
    }
    const fresh = await compute(start, end);
    await cacheSet(key, fresh, CACHE_TTL_SECONDS);
    return { ...fresh, cached: false };
}
