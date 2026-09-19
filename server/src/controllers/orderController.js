import crypto from 'node:crypto';
import BookingOrder from '../models/BookingOrder.js';
import Ticket from '../models/Ticket.js';
import { reserveInventory } from '../services/inventoryService.js';
import { issueTickets } from '../services/ticketService.js';
import { env } from '../config/env.js';
import { success } from '../utils/response.js';

export async function createOrder(req, res) {
    const { eventId, items, idempotencyKey } = req.body;
    const existing = await BookingOrder.findOne({ idempotencyKey, user: req.user._id });
    if (existing) return res.json({ order: existing, result: existing, paymentRequired: existing.status !== 'paid' });

    const event = await reserveInventory(eventId, items);
    const selected = items.map((item) => {
        const type = event.ticketTypes.id(item.ticketTypeId);
        return { ticketTypeId: type._id, name: type.name, quantity: item.quantity, unitPrice: type.price };
    });
    const total = selected.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const onlinePayments = env.hasRazorpay || env.hasStripe;
    const demoCheckout = env.allowDemoPayments && !onlinePayments;
    const order = await BookingOrder.create({
        orderNumber: `UTX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user: req.user._id,
        event: event._id,
        items: selected,
        total,
        currency: 'INR',
        idempotencyKey,
        status: demoCheckout || total === 0 ? 'paid' : 'pending'
    });

    if (order.status === 'paid') await issueTickets(order);

    res.status(201).json({
        order,
        result: order,
        paymentRequired: order.status !== 'paid',
        demoPayment: demoCheckout,
        provider: env.hasRazorpay ? 'razorpay' : env.hasStripe ? 'stripe' : demoCheckout ? 'demo' : null,
        ticketsIssued: order.status === 'paid'
    });
}

export async function myOrders(req, res) {
    const orders = await BookingOrder.find({ user: req.user._id }).populate('event', 'title startsAt venue imageUrl').sort({ createdAt: -1 });
    res.json({ orders, result: orders });
}

export async function myTickets(req, res) {
    const tickets = await Ticket.find({ owner: req.user._id }).populate('event', 'title startsAt venue imageUrl').sort({ createdAt: -1 });
    res.json({ tickets, result: tickets });
}

export async function legacyMyTickets(req, res) {
    const tickets = await Ticket.find({ owner: req.user._id }).populate('event', 'title startsAt venue imageUrl').sort({ createdAt: -1 }).lean();
    return success(res, tickets);
}

export async function ticketLookup(req, res) {
    // Public lookup returns only existence + event title — never owner PII.
    const tickets = await Ticket.find({ confirmationCode: req.params.confirmationId })
        .select('event confirmationCode')
        .populate('event', 'title')
        .lean();
    if (!tickets.length) return res.status(404).json({ message: 'Ticket not found', code: 404 });
    return success(res, {
        confirmation_id: req.params.confirmationId,
        event_title: tickets[0].event?.title,
        ticket_count: tickets.length
    });
}
