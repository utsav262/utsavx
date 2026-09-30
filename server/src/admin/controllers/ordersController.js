import { z } from 'zod';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import BookingOrder from '../../models/BookingOrder.js';
import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import Event from '../../models/Event.js';
import { env } from '../../config/env.js';
import { releaseInventory } from '../../services/inventoryService.js';
import { notifyUser } from '../../services/notificationService.js';
import { audit } from '../middleware/audit.js';
import { containsRegex, escapeRegex, fail, listQuery, parseBody, sendList } from '../services/listing.js';

const razorpay = env.hasRazorpay ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret }) : null;
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

export const ordersQuery = listQuery({
    status: z.enum(['all', 'pending', 'paid', 'cancelled', 'refunded']).default('all'),
    source: z.enum(['all', 'online', 'cash']).default('all'),
    event: z.string().optional()
});

const CASH = ['CASH SALE', 'GATE SALE', 'COMPLIMENTARY'];

/**
 * How an order was paid, and therefore how it must be refunded.
 * Razorpay payment ids live in razorpayPaymentId or (older orders) in paymentIntentId as pay_…
 */
export function paymentOf(o) {
    const pi = o.paymentIntentId || '';
    if (CASH.includes(pi)) return { source: pi, refund: 'manual' };
    const razorpayPayment = o.razorpayPaymentId || (pi.startsWith('pay_') ? pi : null);
    if (razorpayPayment) return { source: 'RAZORPAY', refund: 'razorpay', paymentId: razorpayPayment };
    if (pi.startsWith('order_')) return { source: 'RAZORPAY', refund: 'untraceable' };
    if (pi.startsWith('pi_')) return { source: 'STRIPE', refund: 'stripe', paymentId: pi };
    if (!pi) return { source: 'DEMO', refund: 'manual' };
    return { source: pi, refund: 'untraceable' };
}
const sourceOf = (o) => paymentOf(o).source;

const serialize = (o) => ({
    _id: o._id, order_number: o.orderNumber, status: o.status, total: o.total, currency: o.currency,
    tickets: (o.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0),
    buyer: o.user && typeof o.user === 'object' ? { _id: o.user._id, name: o.user.name, email: o.user.email } : o.user,
    event: o.event && typeof o.event === 'object' ? { _id: o.event._id, title: o.event.title } : o.event,
    source: sourceOf(o), created_at: o.createdAt,
    refund: o.refundedAt ? { at: o.refundedAt, reason: o.refundReason, method: o.refundMethod, reference: o.refundReference } : null
});

export async function list(req, res) {
    const { q, status, source, event } = req.validatedQuery;
    const filter = {};
    if (status !== 'all') filter.status = status;
    if (source === 'cash') filter.paymentIntentId = { $in: CASH };
    if (source === 'online') filter.paymentIntentId = { $nin: CASH };
    if (event && mongoose.isValidObjectId(event)) filter.event = event;
    if (q) {
        const users = await User.find({ $or: [{ email: containsRegex(q) }, { name: containsRegex(q) }] }).select('_id').limit(200).lean();
        filter.$or = [{ orderNumber: new RegExp(`^${escapeRegex(q)}`, 'i') }, { user: { $in: users.map((u) => u._id) } }];
    }
    return sendList(req, res, {
        model: BookingOrder, filter,
        populate: [{ path: 'user', select: 'name email' }, { path: 'event', select: 'title' }],
        serialize, filename: 'orders',
        columns: [
            { label: 'Order', value: 'order_number' }, { label: 'Status', value: 'status' }, { label: 'Total', value: 'total' },
            { label: 'Tickets', value: 'tickets' }, { label: 'Buyer', value: (r) => r.buyer?.email }, { label: 'Event', value: (r) => r.event?.title },
            { label: 'Source', value: 'source' }, { label: 'Created', value: 'created_at' }
        ]
    });
}

export async function detail(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Order not found');
    const order = await BookingOrder.findById(req.params.id).populate('user', 'name email').populate('event', 'title startsAt').lean();
    if (!order) return fail(res, 404, 'Order not found');
    const tickets = await Ticket.find({ order: order._id }).lean();
    return res.json({
        message: 'OK', code: 200,
        result: {
            ...serialize(order),
            items: (order.items || []).map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unitPrice })),
            ticket_list: tickets.map((t) => ({ _id: t._id, code: t.confirmationCode, type: t.ticketType, status: t.status, scanned_at: t.scannedAt })),
            can_refund: order.status === 'paid' && !order.refundRequestedAt && order.total > 0 && paymentOf(order).refund !== 'untraceable',
            refund_via: paymentOf(order).refund
        }
    });
}

async function gatewayRefund(order, reason) {
    const paise = Math.round(Number(order.total || 0) * 100);
    const pay = paymentOf(order);
    if (pay.refund === 'razorpay') {
        if (!razorpay) throw Object.assign(new Error('Razorpay is not configured on this server'), { statusCode: 503 });
        const refund = await razorpay.payments.refund(pay.paymentId, { amount: paise, notes: { reason: reason.slice(0, 250), order: order.orderNumber } });
        return { method: 'razorpay', reference: refund.id };
    }
    if (pay.refund === 'stripe') {
        if (!stripe) throw Object.assign(new Error('Stripe is not configured on this server'), { statusCode: 503 });
        const refund = await stripe.refunds.create({ payment_intent: pay.paymentId, metadata: { order: order.orderNumber } }, { idempotencyKey: `refund-${order._id}` });
        return { method: 'stripe', reference: refund.id };
    }
    if (pay.refund === 'manual') {
        // Cash, gate and demo payments: money moves outside the platform, so this only records it.
        return { method: 'manual', reference: null };
    }
    // Paid online but the payment id is missing: never pretend to refund — send them to the gateway.
    throw Object.assign(new Error("Can't find the gateway payment for this order. Refund it from the Razorpay/Stripe dashboard."), { statusCode: 422 });
}

export async function refund(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Order not found');
    const data = parseBody(z.object({ reason: z.string().trim().min(3).max(300) }), req, res);
    if (!data) return undefined;

    // Lock: only one refund attempt per order.
    const order = await BookingOrder.findOneAndUpdate(
        { _id: req.params.id, status: 'paid', refundRequestedAt: null, total: { $gt: 0 } },
        { $set: { refundRequestedAt: new Date() } },
        { new: true }
    );
    if (!order) {
        const exists = await BookingOrder.exists({ _id: req.params.id });
        return fail(res, exists ? 409 : 404, exists ? 'This order is not refundable (not paid, free, or already refunded).' : 'Order not found');
    }

    let result;
    try {
        result = await gatewayRefund(order, data.reason);
    } catch (error) {
        await BookingOrder.updateOne({ _id: order._id }, { $set: { refundRequestedAt: null } });
        await audit(req, { action: 'order.refund', targetType: 'BookingOrder', targetId: order._id, after: { error: error.message }, status: 'failure' });
        return fail(res, error.statusCode || 502, `Refund failed at the payment provider: ${error.error?.description || error.message}`);
    }

    // Money has moved: record it, cancel tickets and return seats atomically.
    const record = async (session) => {
        await BookingOrder.updateOne({ _id: order._id }, {
            $set: { status: 'refunded', refundedAt: new Date(), refundedBy: req.admin._id, refundReason: data.reason, refundMethod: result.method, refundReference: result.reference }
        }, { session });
        await Ticket.updateMany({ order: order._id, status: 'valid' }, { $set: { status: 'cancelled' } }, { session });
    };
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(() => record(session));
    } catch (error) {
        // Standalone MongoDB (no replica set) can't run transactions; the money already moved, so still record it.
        if (error.code !== 20 && !/replica set|Transaction numbers/i.test(error.message)) throw error;
        await record(undefined);
    } finally {
        await session.endSession();
    }
    await releaseInventory(order.event, order.items);

    await audit(req, { action: 'order.refund', targetType: 'BookingOrder', targetId: order._id, before: { status: 'paid' }, after: { status: 'refunded', method: result.method, reference: result.reference, amount: order.total, reason: data.reason } });
    const event = await Event.findById(order.event).select('title').lean();
    await notifyUser({ userId: order.user, type: 'ORDER_REFUNDED', title: 'Order refunded', message: `Your order ${order.orderNumber} for ${event?.title || 'an event'} was refunded (₹${order.total}).`, payload: { orderId: order._id } });
    const fresh = await BookingOrder.findById(order._id).populate('user', 'name email').populate('event', 'title').lean();
    return res.json({ message: result.method === 'manual' ? 'Marked as refunded (pay the buyer back outside the platform)' : 'Refund issued', code: 200, result: serialize(fresh) });
}

export async function resend(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Order not found');
    const order = await BookingOrder.findById(req.params.id).populate('event', 'title').lean();
    if (!order) return fail(res, 404, 'Order not found');
    if (order.status !== 'paid') return fail(res, 409, 'Only paid orders have tickets to resend');
    const tickets = await Ticket.find({ order: order._id, status: { $ne: 'cancelled' } }).select('confirmationCode').lean();
    await notifyUser({
        userId: order.user, type: 'TICKETS_RESENT', title: 'Your tickets',
        message: `Tickets for ${order.event?.title || 'your event'}: ${tickets.map((t) => t.confirmationCode).join(', ')}. Open My tickets to show the QR codes.`,
        payload: { orderId: order._id }
    });
    await audit(req, { action: 'order.resend', targetType: 'BookingOrder', targetId: order._id });
    return res.json({ message: 'Tickets resent to the buyer (in-app notification)', code: 200 });
}
