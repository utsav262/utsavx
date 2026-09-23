import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import BookingOrder from '../models/BookingOrder.js';
import Coupon from '../models/Coupon.js';
import EventImage from '../models/EventImage.js';
import EventGuest from '../models/EventGuest.js';
import EventHandler from '../models/EventHandler.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { success } from '../utils/response.js';
import { sellTicketOrders } from '../services/sellService.js';
import { invalidateEventCaches } from '../services/cacheService.js';

const eventFor = (req, eventId) => Event.findOne({ _id: eventId, ...(req.user.role === 'admin' ? {} : { organizer: req.user._id }) });
const body = (req) => req.body || {};
const ok = (res, result = null, message = 'Success') => success(res, result, message);
const pick = (source, keys) => {
    const out = {};
    for (const key of keys) {
        if (source[key] !== undefined) out[key] = source[key];
    }
    return out;
};
const EVENT_WRITABLE = ['title', 'slug', 'description', 'category', 'tags', 'venue', 'startsAt', 'endsAt', 'imageUrl', 'status', 'ticketTypes'];
const TICKET_WRITABLE = [
    'name',
    'description',
    'hideDescription',
    'price',
    'doorPrice',
    'quantity',
    'currency',
    'salesStatus',
    'type',
    'ticketType',
    'saleStartsAt',
    'saleEndsAt',
    'passServiceFeeToBuyer',
    'passPaymentFeeToBuyer'
];

function normalizeTicketPayload(data = {}) {
    const ticketTypeRaw = String(data.ticket_type || data.ticketType || '').toLowerCase();
    const ticketType = ticketTypeRaw === 'free' || Number(data.price) === 0 ? 'free' : 'paid';
    const price = ticketType === 'free' ? 0 : Math.max(0, Number(data.price) || 0);
    const doorRaw = data.door_price ?? data.doorPrice;
    const quantityRaw = data.quantity;
    // 0 = unlimited inventory (stored as 0; sell/inventory treat 0 as unlimited)
    const quantity = Math.max(0, Math.floor(Number(quantityRaw) || 0));

    const saleStartsAt = data.sale_start || data.saleStartsAt || data.sale_starts_at || null;
    const saleEndsAt = data.sale_end || data.saleEndsAt || data.sale_ends_at || null;

    return {
        name: String(data.name || '').trim().slice(0, 120),
        description: String(data.description || '').slice(0, 2000),
        hideDescription: Boolean(data.hide_description ?? data.hideDescription),
        price,
        doorPrice: doorRaw === undefined || doorRaw === null || doorRaw === ''
            ? 0
            : Math.max(0, Number(doorRaw) || 0),
        quantity,
        currency: String(data.currency || 'INR').slice(0, 8),
        salesStatus: ['on-sale', 'paused', 'sold-out'].includes(data.salesStatus || data.sales_status)
            ? (data.salesStatus || data.sales_status)
            : 'on-sale',
        type: data.type || 'gate',
        ticketType,
        saleStartsAt: saleStartsAt ? new Date(saleStartsAt) : null,
        saleEndsAt: saleEndsAt ? new Date(saleEndsAt) : null,
        passServiceFeeToBuyer: Boolean(
            data.pass_service_fee_to_buyer ?? data.passServiceFeeToBuyer
        ),
        passPaymentFeeToBuyer: Boolean(
            data.pass_payment_fee_to_buyer ?? data.passPaymentFeeToBuyer
        )
    };
}

function serializeTicket(ticket) {
    if (!ticket) return null;
    const row = typeof ticket.toObject === 'function' ? ticket.toObject() : ticket;
    return {
        ...row,
        id: row._id,
        door_price: row.doorPrice ?? 0,
        ticket_type: row.ticketType || (Number(row.price) === 0 ? 'free' : 'paid'),
        hide_description: Boolean(row.hideDescription),
        sale_start: row.saleStartsAt || null,
        sale_end: row.saleEndsAt || null,
        pass_service_fee_to_buyer: Boolean(row.passServiceFeeToBuyer),
        pass_payment_fee_to_buyer: Boolean(row.passPaymentFeeToBuyer),
        is_complimentary: /apsession.?complimentary|complimentary/i.test(String(row.name || ''))
            || String(row.type || '').toLowerCase() === 'apsession_complimentary'
    };
}
const dashboardCurrency = (events) => { for (const event of events)
        for (const ticket of event.ticketTypes || [])
            if (ticket.currency) return ticket.currency;
    return 'INR'; };
const dashboardDate = (value) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; };
const dashboardRange = (range) => { const now = new Date(); const labels = []; const points = []; if (range === 'year') { const start = new Date(now.getFullYear(), now.getMonth() - 11, 1); for (let index = 0; index < 12; index += 1) { const date = new Date(start.getFullYear(), start.getMonth() + index, 1); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            labels.push({ key, label: date.toLocaleString('en-IN', { month: 'short' }) }); } return { from: start, labels }; } const days = range === 'month' ? 30 : 7; const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1); for (let index = 0; index < days; index += 1) { const date = new Date(start);
        date.setDate(start.getDate() + index); const key = date.toISOString().slice(0, 10);
        labels.push({ key, label: range === 'month' ? String(date.getDate()) : date.toLocaleString('en-IN', { weekday: 'short' }) }); } return { from: start, labels }; };
const dashboardBucket = (date, range) => range === 'year' ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : date.toISOString().slice(0, 10);

export async function dashboardHome(req, res) { const range = req.query.range || 'week'; if (!['week', 'month', 'year'].includes(range)) return res.status(422).json({ message: 'range must be week, month, or year', code: 422 }); const eventFilter = req.user.role === 'admin' ? { status: { $ne: 'cancelled' } } : { organizer: req.user._id, status: { $ne: 'cancelled' } }; const events = await Event.find(eventFilter).sort({ startsAt: 1 }).lean(); const eventIds = events.map((event) => event._id); const orders = await BookingOrder.find({ event: { $in: eventIds }, status: 'paid' }).populate('user', 'name email').sort({ createdAt: -1 }).lean(); const imageRows = await EventImage.find({ event: { $in: eventIds } }).sort({ sortOrder: 1 }).lean(); const coverByEvent = new Map(); for (const image of imageRows)
        if (!coverByEvent.has(String(image.event))) coverByEvent.set(String(image.event), image.url);
    const currency = dashboardCurrency(events); const grossByEvent = new Map(); const soldByEvent = new Map(); for (const order of orders) { const key = String(order.event);
        grossByEvent.set(key, (grossByEvent.get(key) || 0) + order.total);
        soldByEvent.set(key, (soldByEvent.get(key) || 0) + order.items.reduce((sum, item) => sum + item.quantity, 0)); } const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 2); const buckets = { live: [], draft: [], past: [] }; for (const event of events) { const end = dashboardDate(event.endsAt || event.startsAt); const key = event.status === 'draft' || event.status === 'review_pending' ? 'draft' : event.status === 'published' || event.status === 'sold-out' ? (end && end >= cutoff ? 'live' : 'past') : null; if (key) buckets[key].push(event); } const grouped = {}; for (const type of['live', 'draft', 'past']) { const sorted = buckets[type].sort((left, right) => String(left.startsAt).localeCompare(String(right.startsAt)));
        grouped[type] = { total: sorted.length, items: sorted.slice(0, 10).map((event) => { const capacity = (event.ticketTypes || []).filter((ticket) => !['complimentary', 'apsession_complimentary'].includes(String(ticket.name).toLowerCase())).reduce((sum, ticket) => sum + ticket.quantity, 0); const date = dashboardDate(event.startsAt); return { id: event._id, title: event.title, status: type, date: date ? date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '', fullDate: date ? date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '', image: event.imageUrl || coverByEvent.get(String(event._id)) || null, amount: money(grossByEvent.get(String(event._id)) || 0), currency, ticketsSold: soldByEvent.get(String(event._id)) || 0, ticketCap: capacity, slug: event.slug, post_visibility: event.status }; }) }; } const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0); const ticketsSold = orders.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0); const meta = dashboardRange(range); const activity = new Map(meta.labels.map((label) => [label.key, 0])); for (const order of orders) { const created = dashboardDate(order.createdAt); if (created && created >= meta.from) { const key = dashboardBucket(created, range); if (activity.has(key)) activity.set(key, activity.get(key) + order.total); } } return ok(res, { profile: { id: req.user._id, name: req.user.name || (req.user.email ? req.user.email.split('@')[0] : ''), username: req.user.name || '', email: req.user.email || '', logo: req.user.avatarUrl || null, image: req.user.avatarUrl || null, bio: null, followers_count: 0, instagram: null, facebook: null, twitter: null, linkedin: null, website: null, tiktok: null }, events: grouped, revenue: { total: money(totalRevenue), currency, tickets_sold: ticketsSold, ticket_cap: events.reduce((sum, event) => sum + (event.ticketTypes || []).filter((ticket) => String(ticket.name).toLowerCase() !== 'complimentary').reduce((count, ticket) => count + ticket.quantity, 0), 0) }, sales_activity: { range, currency, points: meta.labels.map((label) => ({ label: label.label, amount: money(activity.get(label.key) || 0) })) }, recent_payout: null }, 'Dashboard home fetched successfully'); }
export async function listEvents(req, res) {
    const filter = req.user.role === 'admin' ? {} : { organizer: req.user._id };
    const rows = await Event.find(filter)
        .populate('organizer', 'name email role')
        .sort({ startsAt: -1 })
        .lean();
    return ok(res, rows);
}
export async function singleEvent(req, res) { const event = await eventFor(req, req.params.id); if (!event) return res.status(404).json({ message: 'Event not found', code: 404 }); return ok(res, event); }
export async function createOrUpdateEvent(req, res) {
    const data = body(req);
    const event = data.id ? await eventFor(req, data.id) : null;
    if (data.id && !event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const payload = pick(data, EVENT_WRITABLE);
    if (req.user.role === 'admin' && data.featured !== undefined) payload.featured = Boolean(data.featured);
    if (!event || !payload.slug) {
        payload.slug = data.slug || `${String(data.title || event?.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${crypto.randomBytes(3).toString('hex')}`;
    }

    // Organizers cannot publish directly — admin must approve first.
    if (req.user.role !== 'admin') {
        const requested = payload.status || (event ? event.status : 'draft');
        if (requested === 'published' || requested === 'sold-out') {
            const alreadyLive = event && (event.status === 'published' || event.status === 'sold-out');
            payload.status = alreadyLive && requested === 'sold-out' ? 'sold-out' : alreadyLive ? event.status : 'review_pending';
        } else if (requested && !['draft', 'review_pending', 'cancelled'].includes(requested)) {
            payload.status = event?.status || 'draft';
        }
    }

    if (Array.isArray(payload.ticketTypes)) {
        const existingById = new Map((event?.ticketTypes || []).map((ticket) => [String(ticket._id), ticket]));
        payload.ticketTypes = payload.ticketTypes.map((ticket) => {
            const normalized = normalizeTicketPayload(ticket);
            const previous = ticket._id ? existingById.get(String(ticket._id)) : null;
            const safe = pick({ ...previous?.toObject?.() || previous || {}, ...normalized }, TICKET_WRITABLE);
            if (ticket._id) safe._id = ticket._id;
            return {
                ...safe,
                currency: safe.currency || previous?.currency || 'INR',
                salesStatus: safe.salesStatus || previous?.salesStatus || 'on-sale',
                price: Math.max(0, Number(safe.price ?? previous?.price) || 0),
                quantity: (() => {
                    const qty = Math.max(0, Math.floor(Number(safe.quantity ?? previous?.quantity) || 0));
                    if (qty === 0) return 0; // unlimited
                    return Math.max(previous?.sold || 0, qty);
                })(),
                sold: previous?.sold || 0
            };
        });
    }

    if (!event) {
        const result = await Event.create({ ...payload, organizer: req.user._id });
        await invalidateEventCaches(result);
        const message = result.status === 'review_pending'
            ? 'Event submitted for admin approval'
            : 'Event created successfully';
        return res.status(201).json({ message, code: 200, result });
    }
    const result = await Event.findOneAndUpdate({ _id: event._id }, { $set: payload }, { new: true, runValidators: true });
    await invalidateEventCaches(result || event);
    return res.status(200).json({ message: 'Event updated successfully', code: 200, result });
}

export async function pendingEvents(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can review events', code: 403 });
    const rows = await Event.find({ status: 'review_pending' })
        .populate('organizer', 'name email')
        .sort({ updatedAt: -1 })
        .lean();
    return ok(res, rows, 'Pending events fetched successfully');
}

export async function approveEvent(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can approve events', code: 403 });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    if (event.status !== 'review_pending' && event.status !== 'draft') {
        return res.status(422).json({ message: 'Only pending or draft events can be approved', code: 422 });
    }
    event.status = 'published';
    await event.save();
    await invalidateEventCaches(event);
    return ok(res, event, 'Event approved and published');
}

export async function rejectEvent(req, res) {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can reject events', code: 403 });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    if (event.status !== 'review_pending') {
        return res.status(422).json({ message: 'Only pending events can be rejected', code: 422 });
    }
    event.status = 'draft';
    await event.save();
    await invalidateEventCaches(event);
    return ok(res, event, 'Event rejected and returned to draft');
}
export async function deleteEvent(req, res) {
    const event = await eventFor(req, req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    event.status = 'cancelled';
    await event.save();
    await invalidateEventCaches(event);
    return ok(res, null, 'Event cancelled successfully');
}
export async function upgradeEvent(req, res) {
    const event = await eventFor(req, req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const updates = pick(body(req), ['title', 'description', 'category', 'tags', 'venue', 'startsAt', 'endsAt', 'imageUrl']);
    if (req.user.role === 'admin') {
        const privileged = pick(body(req), ['status', 'featured', 'slug']);
        Object.assign(updates, privileged);
    }
    Object.assign(event, updates);
    await event.save();
    return ok(res, event, 'Event upgraded successfully');
}
export async function getTickets(req, res) {
    const event = await eventFor(req, req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const role = String(req.params.type || 'all').toLowerCase();
    let rows = event.ticketTypes || [];
    if (role === 'gate') {
        rows = rows.filter((ticket) => Number(ticket.doorPrice || 0) > 0);
    } else if (role === 'paid') {
        rows = rows.filter((ticket) => (ticket.ticketType || 'paid') === 'paid' && Number(ticket.price) > 0);
    } else if (role === 'free') {
        rows = rows.filter((ticket) => (ticket.ticketType || '') === 'free' || Number(ticket.price) === 0);
    }
    return ok(res, rows.map(serializeTicket));
}
export async function createTicket(req, res) {
    const data = body(req);
    const eventId = data.eventId || data.event_id;
    if (!eventId || !data.name) {
        return res.status(422).json({ message: 'eventId and name are required', code: 422 });
    }
    if (data.price === undefined && data.ticket_type !== 'free' && data.ticketType !== 'free') {
        return res.status(422).json({ message: 'price is required for paid tickets', code: 422 });
    }
    if (data.quantity === undefined) {
        return res.status(422).json({ message: 'quantity is required', code: 422 });
    }
    const event = await eventFor(req, eventId);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const ticket = normalizeTicketPayload(data);
    if (!ticket.name) return res.status(422).json({ message: 'name is required', code: 422 });
    if (ticket.ticketType === 'paid' && ticket.price <= 0) {
        return res.status(422).json({ message: 'Paid tickets must have price > 0', code: 422 });
    }
    event.ticketTypes.push(ticket);
    await event.save();
    await invalidateEventCaches(event);
    return ok(res, serializeTicket(event.ticketTypes.at(-1)), 'Ticket type created successfully');
}
export async function updateTicket(req, res) {
    const event = await Event.findOne({ 'ticketTypes._id': req.params.id, ...(req.user.role === 'admin' ? {} : { organizer: req.user._id }) });
    if (!event) return res.status(404).json({ message: 'Ticket type not found', code: 404 });
    const ticket = event.ticketTypes.id(req.params.id);
    if (isSystemComplimentary(ticket)) {
        return res.status(422).json({ message: 'System complimentary tickets cannot be edited', code: 422 });
    }
    const updates = normalizeTicketPayload({ ...ticket.toObject(), ...body(req) });
    if (updates.quantity !== undefined && Number(updates.quantity) > 0) {
        updates.quantity = Math.max(ticket.sold || 0, updates.quantity);
    }
    // quantity === 0 means unlimited — keep as 0 even if some tickets were already sold
    if (updates.ticketType === 'paid' && updates.price <= 0) {
        return res.status(422).json({ message: 'Paid tickets must have price > 0', code: 422 });
    }
    Object.assign(ticket, updates);
    await event.save();
    await invalidateEventCaches(event);
    return ok(res, serializeTicket(ticket), 'Ticket type updated successfully');
}
export async function deleteTicket(req, res) {
    const event = await Event.findOne({ 'ticketTypes._id': req.params.id, ...(req.user.role === 'admin' ? {} : { organizer: req.user._id }) });
    if (!event) return res.status(404).json({ message: 'Ticket type not found', code: 404 });
    const ticket = event.ticketTypes.id(req.params.id);
    if (isSystemComplimentary(ticket)) {
        return res.status(422).json({ message: 'System complimentary tickets cannot be deleted', code: 422 });
    }
    event.ticketTypes.pull(req.params.id);
    await event.save();
    await invalidateEventCaches(event);
    return ok(res, null, 'Ticket type deleted successfully');
}

function isSystemComplimentary(ticket) {
    if (!ticket) return false;
    const name = String(ticket.name || '');
    const type = String(ticket.type || '');
    return /apsession.?complimentary/i.test(name)
        || type.toLowerCase() === 'apsession_complimentary';
}
const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const feeBreakdown = (pricePaid, paymentFee = 0, serviceFee = 0) => ({ configuration: null, label: null, fees: [{ type: 'payment', name: 'Payment Fee', amount: money(paymentFee), paid_by: 'host' }, { type: 'service', name: 'Service Fee', amount: money(serviceFee), paid_by: 'host' }, { type: 'commission', name: 'Commission', amount: 0, paid_by: 'host' }], price_paid: money(pricePaid), buyer_fee: 0, buyer_paid_total: money(pricePaid), host_fee: money(paymentFee + serviceFee), host_payout: money(pricePaid - paymentFee - serviceFee) });
const orderRows = (orders, search = '') => orders.flatMap((order) => order.items.map((item, index) => ({
    id: `${order._id}-${index}`,
    order_id: order._id,
    event_id: order.event,
    confirmation_id: order.orderNumber,
    ticket_type: item.name,
    username: order.user?.name || '',
    email: order.user?.email || '',
    payment_status: order.status === 'paid' ? 'Paid' : order.status,
    payment_type: order.soldBy || /SALE|COMPLIMENTARY/i.test(String(order.paymentIntentId || '')) ? 'Cash / Door' : 'UPI / Card',
    purchase_source: order.paymentIntentId && /SALE|COMPLIMENTARY/i.test(String(order.paymentIntentId))
        ? order.paymentIntentId
        : 'Online',
    price_paid: money(item.unitPrice * item.quantity),
    quantity: item.quantity,
    created_on: order.createdAt,
    parent_id: index === 0 ? 0 : String(order._id),
    all_tickets_count: order.items.reduce((sum, line) => sum + line.quantity, 0),
    fee_breakdown: feeBreakdown(item.unitPrice * item.quantity, 0, item.unitPrice * item.quantity * 0.05),
    group_fee_breakdown: feeBreakdown(order.total, 0, order.total * 0.05)
}))).filter((row) => !search || [row.confirmation_id, row.ticket_type, row.username, row.email].some((value) => String(value).toLowerCase().includes(search.toLowerCase())));
const paged = (rows, page, length) => ({ rows: rows.slice((page - 1) * length, page * length), pagination: { current_page: page, last_page: Math.max(1, Math.ceil(rows.length / length)), has_next_page: page * length < rows.length } });
const eventTotals = (event, orders, tickets) => { const gross = orders.reduce((sum, order) => sum + order.total, 0); const sold = orders.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0); const checkIns = tickets.filter((ticket) => ticket.status === 'used').length; return { gross_sales: money(gross), fees: money(gross * 0.05), earnings: money(gross * 0.95), apsession_earnings: money(gross * 0.05), outlet_earnings: 0, ambassador_earnings: 0, commission: 0, cash_sales: 0, payout_due: money(gross * 0.95), remitted: 0, remittance: { remitted: 0, pending: 0, last_remitted_at: null }, total_sold: sold, claimed_tickets: checkIns, unclaimed_tickets: Math.max(0, sold - checkIns), sales_by_type: event.ticketTypes.map((type) => ({ ticket_type: type.name, name: type.name, sold: orders.reduce((sum, order) => sum + order.items.filter((item) => String(item.ticketTypeId) === String(type._id)).reduce((count, item) => count + item.quantity, 0), 0), available: type.quantity, percent: type.quantity ? Math.round((type.sold / type.quantity) * 100) : 0 })) }; };
export async function listOrders(req, res) { const event = await eventFor(req, req.params.id); if (!event) return res.status(404).json({ message: 'Event not found', code: 404 }); const orders = await BookingOrder.find({ event: event._id, status: 'paid' }).populate('user', 'name email').sort({ createdAt: -1 }).lean(); const type = ['summary', 'purchase_history', 'transactions'].includes(req.query.type) ? req.query.type : 'summary'; const rows = orderRows(orders, String(req.query.search || '').trim()); const page = Math.max(1, Number(req.query.page || 1)); const length = Math.min(100, Math.max(1, Number(req.query.length || 20))); const tickets = await Ticket.find({ event: event._id }).lean(); const result = { type, event_link: event.slug, ...eventTotals(event, orders, tickets), table_data: type === 'summary' ? null : paged(rows, page, length).rows }; return success(res, result, 'Dashboard data fetched successfully', 200, type === 'summary' ? {} : paged(rows, page, length).pagination); }
export async function salesByType(req, res) { const event = await eventFor(req, req.params.id); if (!event) return res.status(404).json({ message: 'Event not found', code: 404 }); const orders = await BookingOrder.find({ event: event._id, status: 'paid' }).lean(); const tickets = await Ticket.find({ event: event._id }).lean(); const summary = eventTotals(event, orders, tickets); const type = ['summary', 'purchase_history', 'transactions'].includes(req.query.type) ? req.query.type : 'purchase_history'; const rows = orderRows(orders, String(req.query.search || '').trim()); const page = Math.max(1, Number(req.query.page || 1)); const length = Math.min(100, Math.max(1, Number(req.query.length || 20))); return success(res, { type, event_link: event.slug, ...summary, table_data: type === 'summary' ? null : paged(rows, page, length).rows }, 'Sales by type fetched successfully', 200, type === 'summary' ? {} : paged(rows, page, length).pagination); }
export async function salesOverview(req, res) { const event = await eventFor(req, req.params.id); if (!event) return res.status(404).json({ message: 'Event not found', code: 404 }); const orders = await BookingOrder.find({ event: event._id, status: 'paid' }).lean(); const sold = orders.reduce((sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0); const available = event.ticketTypes.reduce((sum, type) => sum + type.quantity, 0); return ok(res, { event_name: event.title, tickets_sold: sold, tickets_available: available, sold_percent: available ? Math.round((sold / available) * 100) : 0, ticket_types: event.ticketTypes.map((type) => ({ ticket_type: type.name, name: type.name, sold: type.sold, available: type.quantity, percent: type.quantity ? Math.round((type.sold / type.quantity) * 100) : 0 })), sales_sources: [{ source: 'Online', count: sold }] }, 'Sales overview fetched successfully'); }
export async function payouts(req, res) { const event = await eventFor(req, req.params.id); if (!event) return res.status(404).json({ message: 'Event not found', code: 404 }); const orders = await BookingOrder.find({ event: event._id, status: 'paid' }).lean(); const gross = orders.reduce((sum, order) => sum + order.total, 0); return ok(res, { gross: money(gross), fees: money(gross * 0.05), payout_due: money(gross * 0.95), remitted: 0, pending: money(gross * 0.95) }, 'Payout information fetched successfully'); }
export async function checkIns(req, res) { const event = await eventFor(req, req.params.id); if (!event) return res.status(404).json({ message: 'Event not found', code: 404 }); const tickets = await Ticket.find({ event: event._id }).populate('owner', 'name email').lean(); const claimed = tickets.filter((ticket) => ticket.status === 'used').length; return ok(res, { event_name: event.title, claimed_tickets: claimed, unclaimed_tickets: tickets.filter((ticket) => ticket.status === 'valid').length, ticket_types: event.ticketTypes.map((type) => ({ name: type.name, claimed: tickets.filter((ticket) => ticket.ticketType === type.name && ticket.status === 'used').length })), timeline: [] }, 'Check-in stats fetched successfully'); }
function normalizeTicketCode(raw) {
    let code = String(raw || '').trim();
    if (code.startsWith('{')) {
        try {
            const parsed = JSON.parse(code);
            code = String(parsed.confirmationCode || parsed.confirmation_id || parsed.code || code).trim();
        } catch { /* keep raw */ }
    }
    return code;
}

export async function scanTicket(req, res) {
    const eventId = body(req).event_id;
    const code = normalizeTicketCode(body(req).code || body(req).confirmation_id || body(req).confirmationCode || '');
    const action = body(req).action || 'validate';
    if (!eventId || !code) return res.status(422).json({ message: 'event_id and code are required', code: 422 });
    const event = await eventFor(req, eventId);
    if (!event) return res.status(403).json({ message: 'You cannot scan tickets for this event', code: 403 });
    const ticket = await Ticket.findOne({ event: event._id, confirmationCode: code });
    if (!ticket) return res.status(422).json({ status: 'invalid', ticket_status: 'invalid', message: 'Invalid ticket.', code: 422, result: {} });
    if (ticket.status === 'used') {
        return res.status(422).json({
            status: 'already_claimed',
            ticket_status: 'already_claimed',
            message: 'Ticket already claimed.',
            code: 422,
            result: { ticket_id: ticket._id, confirmation_id: ticket.confirmationCode }
        });
    }
    if (ticket.status !== 'valid') {
        return res.status(422).json({
            status: 'payment_not_done',
            ticket_status: 'payment_not_done',
            message: 'Ticket is not valid for entry.',
            code: 422,
            result: {}
        });
    }
    if (action === 'scan') {
        const claimed = await Ticket.findOneAndUpdate(
            { _id: ticket._id, status: 'valid' },
            { $set: { status: 'used', scannedAt: new Date() } },
            { new: true }
        );
        if (!claimed) {
            return res.status(422).json({
                status: 'already_claimed',
                ticket_status: 'already_claimed',
                message: 'Ticket already claimed.',
                code: 422,
                result: {}
            });
        }
        return res.json({
            status: 'success',
            ticket_status: 'scanned',
            message: 'Ticket scanned successfully!',
            code: 200,
            result: {
                ticket_id: claimed._id,
                confirmation_id: claimed.confirmationCode,
                ticket_type: claimed.ticketType,
                payment_status: 'Claimed',
                scanned_at: claimed.scannedAt
            }
        });
    }
    return res.json({
        status: 'success',
        ticket_status: 'valid',
        message: 'Ticket is valid!',
        code: 200,
        result: {
            ticket_id: ticket._id,
            confirmation_id: ticket.confirmationCode,
            ticket_type: ticket.ticketType,
            payment_status: 'Paid'
        }
    });
}
export async function sell(req, res) {
    try {
        const data = body(req);
        const result = await sellTicketOrders({
            user: req.user,
            eventId: data.event_id || data.eventId,
            tickets: data.tickets || [],
            purchaseSource: data.purchase_source || data.purchaseSource,
            complimentary: Boolean(data.complimentary)
        });
        return ok(res, result, 'Tickets sold successfully');
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Sell failed',
            code: error.statusCode || 500
        });
    }
}
const normalizeCoupon = (input, requireEvent = true) => {
    const value = {...input };
    const event = value.event_id || value.eventId || value.event;
    const discountType = value.discount_type || value.discountType;
    const discountValue = value.discount_value !== undefined ? value.discount_value : value.discountValue;
    if (requireEvent && !event) throw Object.assign(new Error('event_id is required.'), { statusCode: 422 });
    if (requireEvent && (!value.code || !discountType || discountValue === undefined)) throw Object.assign(new Error('code, discount_type, and discount_value are required.'), { statusCode: 422 });
    if (discountType && !['percentage', 'fixed'].includes(discountType)) throw Object.assign(new Error('discount_type must be percentage or fixed.'), { statusCode: 422 });
    if (discountType === 'percentage' && Number(discountValue) > 100) throw Object.assign(new Error('A percentage discount cannot exceed 100.'), { statusCode: 422 });
    if (value.starts_at && value.ends_at && new Date(value.ends_at) < new Date(value.starts_at)) throw Object.assign(new Error('ends_at must be after or equal to starts_at.'), { statusCode: 422 });
    const result = {};
    if (value.code !== undefined) result.code = String(value.code).trim().toUpperCase();
    if (event) result.event = event;
    if (discountType) result.discountType = discountType;
    if (discountValue !== undefined) result.discountValue = Number(discountValue);
    const mappings = [
        ['currency', 'currency'],
        ['min_subtotal', 'minSubtotal'],
        ['minimum_amount', 'minimumAmount'],
        ['max_uses', 'maxUses'],
        ['per_user_limit', 'perUserLimit'],
        ['starts_at', 'startsAt'],
        ['ends_at', 'endsAt'],
        ['is_active', 'isActive'],
        ['is_public', 'isPublic']
    ];
    for (const [source, target] of mappings)
        if (value[source] !== undefined) result[target] = value[source];
    if (result.minSubtotal !== undefined) result.minimumAmount = result.minSubtotal;
    if (result.endsAt !== undefined) result.expiresAt = result.endsAt;
    if (result.isActive !== undefined) result.active = result.isActive;
    return result;
};
const couponEvent = (req, eventId) => Event.findOne({ _id: eventId, ...(req.user.role === 'admin' ? {} : { organizer: req.user._id }) }).select('_id organizer');
export async function coupons(req, res) { const event = await couponEvent(req, req.params.eventId); if (!event) return res.status(404).json({ message: 'Event not found.', code: 404 }); return ok(res, await Coupon.find({ event: event._id }).sort({ createdAt: -1 }).lean(), 'Coupons retrieved successfully'); }
export async function createCoupon(req, res) { try { const data = normalizeCoupon(body(req)); const event = await couponEvent(req, data.event); if (!event) return res.status(404).json({ message: 'Event not found.', code: 404 }); if (await Coupon.exists({ event: event._id, code: data.code })) return res.status(409).json({ message: 'A coupon with this code already exists for this event.', code: 409 }); const coupon = await Coupon.create({...data, createdBy: req.user._id, createdByRole: req.user.role === 'admin' ? 'admin' : 'host', usedCount: 0 }); return res.status(201).json({ message: 'Coupon created successfully!', code: 200, result: coupon }); } catch (error) { return res.status(error.statusCode || 422).json({ message: error.message, code: error.statusCode || 422 }); } }
export async function updateCoupon(req, res) {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found.', code: 404 });
        const event = await couponEvent(req, coupon.event);
        if (!event) return res.status(403).json({ message: 'You do not have permission to manage coupons for this event.', code: 403 });
        const data = normalizeCoupon(body(req), false);
        delete data.event;
        const effectiveType = data.discountType || coupon.discountType;
        const effectiveValue = data.discountValue !== undefined ? data.discountValue : coupon.discountValue;
        const effectiveStart = data.startsAt || coupon.startsAt;
        const effectiveEnd = data.endsAt || coupon.endsAt;
        if (effectiveType === 'percentage' && Number(effectiveValue) > 100) return res.status(422).json({ message: 'A percentage discount cannot exceed 100.', code: 422 });
        if (effectiveStart && effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) return res.status(422).json({ message: 'ends_at must be after or equal to starts_at.', code: 422 });
        if (data.code && await Coupon.exists({ _id: { $ne: coupon._id }, event: coupon.event, code: data.code })) return res.status(409).json({ message: 'Another coupon with this code already exists for this event.', code: 409 });
        Object.assign(coupon, data);
        await coupon.save();
        return ok(res, coupon, 'Coupon updated successfully!');
    } catch (error) { return res.status(error.statusCode || 422).json({ message: error.message, code: error.statusCode || 422 }); }
}
export async function deleteCoupon(req, res) {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.', code: 404 });
    const event = await couponEvent(req, coupon.event);
    if (!event) return res.status(403).json({ message: 'You do not have permission to manage coupons for this event.', code: 403 });
    await coupon.deleteOne();
    return ok(res, null, 'Coupon deleted successfully!');
}
async function ownedHandler(req, handlerId) {
    const handler = await EventHandler.findById(handlerId);
    if (!handler) return { error: ['Handler not found', 404] };
    const event = await eventFor(req, handler.event);
    if (!event) return { error: ['You do not have permission to manage this event', 403] };
    return { handler, event };
}
async function ownedGuest(req, guestId) {
    const guest = await EventGuest.findById(guestId);
    if (!guest) return { error: ['Guest not found', 404] };
    const event = await eventFor(req, guest.event);
    if (!event) return { error: ['You do not have permission to manage this event', 403] };
    return { guest, event };
}
export async function images(req, res) {
    const event = await eventFor(req, req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    return ok(res, await EventImage.find({ event: event._id }).sort({ sortOrder: 1 }).lean());
}
export async function createImage(req, res) {
    const data = body(req);
    const event = await eventFor(req, data.eventId || data.event_id || req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const image = await EventImage.create({
        url: data.url,
        alt: data.alt,
        type: data.type || 'gallery',
        sortOrder: data.sortOrder || 0,
        event: event._id
    });
    return res.status(201).json({ message: 'Image created successfully', code: 200, result: image });
}
export async function deleteImage(req, res) {
    const image = await EventImage.findById(req.params.id);
    if (!image) return res.status(404).json({ message: 'Image not found', code: 404 });
    const event = await eventFor(req, image.event);
    if (!event) return res.status(403).json({ message: 'You do not have permission to manage this event', code: 403 });
    await image.deleteOne();
    return ok(res, null, 'Image deleted successfully');
}
export async function guests(req, res) {
    const event = await eventFor(req, req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    return ok(res, await EventGuest.find({ event: event._id }).lean());
}
export async function createGuest(req, res) {
    const data = body(req);
    const event = await eventFor(req, data.eventId || data.event_id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const guest = await EventGuest.create({ name: data.name, email: data.email, event: event._id, status: data.status || 'invited' });
    return res.status(201).json({ message: 'Guest created successfully', code: 200, result: guest });
}
export async function updateGuest(req, res) {
    const found = await ownedGuest(req, req.params.id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });
    const data = body(req);
    Object.assign(found.guest, { name: data.name ?? found.guest.name, email: data.email ?? found.guest.email, status: data.status ?? found.guest.status });
    await found.guest.save();
    return ok(res, found.guest, 'Guest updated successfully');
}
export async function deleteGuest(req, res) {
    const found = await ownedGuest(req, req.params.id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });
    await found.guest.deleteOne();
    return ok(res, null, 'Guest deleted successfully');
}
function mapHandlerUserType(raw) {
    const value = String(raw || '').trim();
    if (['Manager', 'Ambassador', 'Outlet', 'Event_Scanner'].includes(value)) return value;
    const lower = value.toLowerCase();
    if (lower === 'manager') return 'Manager';
    if (lower === 'ambassador') return 'Ambassador';
    if (lower === 'outlet') return 'Outlet';
    return 'Event_Scanner';
}

export async function handlers(req, res) {
    if (!req.params.id) {
        const filter = req.user.role === 'admin' ? {} : { organizer: req.user._id };
        const events = await Event.find(filter).select('_id');
        return ok(res, await EventHandler.find({ event: { $in: events.map((event) => event._id) } }).lean());
    }
    const event = await eventFor(req, req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const query = { event: event._id };
    if (req.params.type && req.params.type !== 'all') query.userType = mapHandlerUserType(req.params.type);
    const rows = await EventHandler.find(query).lean();
    return ok(res, rows.map((row) => ({
        ...row,
        type: row.userType,
        status: row.invitationStatus
    })));
}
export async function addHandler(req, res) {
    const data = body(req);
    const event = await eventFor(req, data.eventId || data.event_id);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    const email = String(data.email || '').trim().toLowerCase();
    if (!email) return res.status(422).json({ message: 'email is required', code: 422 });
    const userType = mapHandlerUserType(data.userType || data.user_type || data.type);

    const existing = await EventHandler.findOne({
        event: event._id,
        email,
        invitationStatus: { $in: ['P', 'A'] }
    });
    if (existing) {
        return res.status(409).json({
            message: existing.invitationStatus === 'A'
                ? 'This person is already on the team for this event'
                : 'An invite is already pending for this email',
            code: 409
        });
    }

    const allotments = [];
    if (Array.isArray(data.tickets)) {
        for (const row of data.tickets) {
            const ticketTypeId = row.event_ticket_id || row.ticketTypeId || row.ticket_type_id;
            const quantity = Math.max(0, Math.floor(Number(row.quantity) || 0));
            if (ticketTypeId && quantity > 0) allotments.push({ ticketTypeId, quantity });
        }
    } else if (Array.isArray(data.allotments)) {
        for (const row of data.allotments) {
            const ticketTypeId = row.event_ticket_id || row.ticketTypeId;
            const quantity = Math.max(0, Math.floor(Number(row.quantity) || 0));
            if (ticketTypeId && quantity > 0) allotments.push({ ticketTypeId, quantity });
        }
    }

    const scannerPermission = ['scan_only', 'sell_only', 'both'].includes(data.scannerPermission || data.scanner_permission)
        ? (data.scannerPermission || data.scanner_permission)
        : (userType === 'Event_Scanner' ? 'scan_only' : 'both');

    const handler = await EventHandler.create({
        email,
        event: event._id,
        userType,
        invitationStatus: 'P',
        scannerPermission,
        commissionPercentage: Number(data.commissionPercentage || data.commission_percentage || data.commission || 0) || 0,
        firstName: data.firstName || data.first_name || undefined,
        lastName: data.lastName || data.last_name || undefined,
        verified: Boolean(data.verified),
        allotments
    });
    return res.status(201).json({
        message: 'Handler invited successfully',
        code: 200,
        result: { ...handler.toObject(), type: handler.userType, status: handler.invitationStatus }
    });
}
export async function updateAssignedTickets(req, res) {
    const found = await ownedHandler(req, body(req).id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });
    found.handler.commissionPercentage = Number(body(req).assignedTickets || body(req).commissionPercentage || 0) || 0;
    await found.handler.save();
    return ok(res, found.handler, 'Assigned tickets updated successfully');
}
export async function deleteHandler(req, res) {
    const found = await ownedHandler(req, req.params.id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });
    await found.handler.deleteOne();
    return ok(res, null, 'Handler removed successfully');
}
export async function acceptHandler(req, res) {
    const found = await ownedHandler(req, body(req).id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });
    found.handler.invitationStatus = 'A';
    await found.handler.save();
    return ok(res, found.handler, 'Invitation accepted successfully');
}
export async function rejectHandler(req, res) {
    const found = await ownedHandler(req, req.params.id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });
    found.handler.invitationStatus = 'D';
    await found.handler.save();
    return ok(res, found.handler, 'Invitation rejected successfully');
}
export async function resendInvite(req, res) { return ok(res, null, 'Invitation resent successfully'); }
export async function resendNotification(req, res) { return ok(res, null, 'Notification resent successfully'); }
export async function notifications(req, res) { return ok(res, await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean()); }
export async function notificationSettings(req, res) { return ok(res, { email: true, push: true }); }
export async function updateNotificationSettings(req, res) { return ok(res, body(req), 'Notification settings updated successfully'); }
export async function presign(req, res) { return res.status(503).json({ message: 'S3 is not configured', code: 503 }); }
export async function uploadImage(req, res) { return presign(req, res); }
export async function collections(req, res) { return ok(res, []); }

const requireAdmin = (req, res) => {
    if (req.user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required', code: 403 });
        return false;
    }
    return true;
};

export async function adminOverview(req, res) {
    if (!requireAdmin(req, res)) return;
    const [users, events, orders, pendingCount] = await Promise.all([
        User.find().select('role').lean(),
        Event.find().select('status featured').lean(),
        BookingOrder.find({ status: 'paid' }).select('total').lean(),
        Event.countDocuments({ status: 'review_pending' })
    ]);
    const byRole = { customer: 0, organizer: 0, admin: 0 };
    for (const user of users) byRole[user.role] = (byRole[user.role] || 0) + 1;
    const byStatus = {};
    let featured = 0;
    for (const event of events) {
        byStatus[event.status] = (byStatus[event.status] || 0) + 1;
        if (event.featured) featured += 1;
    }
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return ok(res, {
        users: { total: users.length, ...byRole },
        events: { total: events.length, featured, pending: pendingCount, byStatus },
        revenue,
        orders: orders.length
    }, 'Admin overview fetched successfully');
}

export async function adminUsers(req, res) {
    if (!requireAdmin(req, res)) return;
    const users = await User.find()
        .select('name email role createdAt +passwordPlain')
        .sort({ createdAt: -1 })
        .lean();
    return ok(
        res,
        users.map((user) => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            password: user.passwordPlain || null
        })),
        'Users fetched successfully'
    );
}

export async function adminUpdateUserRole(req, res) {
    if (!requireAdmin(req, res)) return;
    const role = String(body(req).role || '').trim();
    if (!['customer', 'organizer', 'admin'].includes(role)) {
        return res.status(422).json({ message: 'role must be customer, organizer, or admin', code: 422 });
    }
    if (String(req.params.id) === String(req.user._id) && role !== 'admin') {
        return res.status(422).json({ message: 'You cannot remove your own admin role', code: 422 });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { role } }, { new: true })
        .select('name email role createdAt +passwordPlain');
    if (!user) return res.status(404).json({ message: 'User not found', code: 404 });
    const payload = user.toObject();
    return ok(
        res,
        {
            _id: payload._id,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            createdAt: payload.createdAt,
            password: payload.passwordPlain || null
        },
        'User role updated successfully'
    );
}

export async function adminUpdateUserPassword(req, res) {
    if (!requireAdmin(req, res)) return;
    const password = String(body(req).password || '');
    if (password.length < 8) {
        return res.status(422).json({ message: 'Password must be at least 8 characters', code: 422 });
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(422).json({
            message: 'Password must include at least one letter and one number',
            code: 422
        });
    }
    const user = await User.findById(req.params.id).select('+passwordHash +passwordPlain');
    if (!user) return res.status(404).json({ message: 'User not found', code: 404 });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordPlain = password;
    await user.save();
    return ok(
        res,
        {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            password
        },
        'User password updated successfully'
    );
}

export async function adminSetEventStatus(req, res) {
    if (!requireAdmin(req, res)) return;
    const status = String(body(req).status || '').trim();
    const allowed = ['draft', 'published', 'sold-out', 'cancelled', 'review_pending'];
    if (!allowed.includes(status)) {
        return res.status(422).json({ message: `status must be one of: ${allowed.join(', ')}`, code: 422 });
    }
    const event = await Event.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true, runValidators: true })
        .populate('organizer', 'name email role');
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    await invalidateEventCaches(event);
    return ok(res, event, `Event marked as ${status}`);
}

export async function adminSetEventFeatured(req, res) {
    if (!requireAdmin(req, res)) return;
    const featured = Boolean(body(req).featured);
    const event = await Event.findByIdAndUpdate(req.params.id, { $set: { featured } }, { new: true })
        .populate('organizer', 'name email role');
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });
    await invalidateEventCaches(event);
    return ok(res, event, featured ? 'Event featured' : 'Event unfeatured');
}