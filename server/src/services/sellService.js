import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import Event from '../models/Event.js';
import EventHandler from '../models/EventHandler.js';
import BookingOrder from '../models/BookingOrder.js';
import User from '../models/User.js';
import { issueTickets } from './ticketService.js';
import { reserveInventory, releaseInventory } from './inventoryService.js';

function canSellHandler(handler) {
    if (!handler || handler.invitationStatus !== 'A') return false;
    if (handler.userType === 'Manager' || handler.userType === 'Ambassador' || handler.userType === 'Outlet') {
        return true;
    }
    if (handler.userType !== 'Event_Scanner') return false;
    const permission = handler.scannerPermission || 'both';
    return permission === 'sell_only' || permission === 'both';
}

export async function assertSellAccess(user, eventId) {
    const event = await Event.findById(eventId);
    if (!event) {
        const error = new Error('Event not found');
        error.statusCode = 404;
        throw error;
    }

    const isOwner = user.role === 'admin' || String(event.organizer) === String(user._id);
    if (isOwner) return { event, handler: null, isOwner: true };

    const handler = await EventHandler.findOne({
        event: eventId,
        email: String(user.email || '').toLowerCase(),
        invitationStatus: 'A'
    });
    if (!handler || !canSellHandler(handler)) {
        const error = new Error('You do not have sell access for this event');
        error.statusCode = 403;
        throw error;
    }
    return { event, handler, isOwner: false };
}

/**
 * Resolve the buyer account for a sold ticket.
 * Prefers an existing user by attendee email so "My tickets" on web shows the sale.
 * Creates a customer account when the email is new.
 */
async function resolveBuyerUser(attendee, fallbackSeller) {
    const email = String(attendee?.email || '').trim().toLowerCase();
    if (!email) return fallbackSeller;

    const existing = await User.findOne({ email });
    if (existing) return existing;

    const name = [attendee.first_name, attendee.last_name]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' ') || email.split('@')[0];
    const tempPassword = `Tix${crypto.randomBytes(4).toString('hex')}1a`;
    return User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(tempPassword, 12),
        passwordPlain: tempPassword,
        role: 'customer'
    });
}

/**
 * Cash / door sell used by owner and accepted handlers.
 * tickets[]: { event_ticket_id, first_name, last_name, delivery_method, email, phone, price? }
 *
 * Tickets are owned by the attendee (buyer email), not the selling manager,
 * so they appear under that user's My tickets on web/app.
 */
export async function sellTicketOrders({ user, eventId, tickets, purchaseSource, complimentary = false }) {
    if (!eventId || !Array.isArray(tickets) || !tickets.length) {
        const error = new Error('event_id and tickets are required');
        error.statusCode = 422;
        throw error;
    }

    const { event } = await assertSellAccess(user, eventId);
    if (event.status !== 'published' && event.status !== 'sold-out') {
        const error = new Error('Event is not available for sales');
        error.statusCode = 409;
        throw error;
    }

    const isGate = String(purchaseSource || '').toUpperCase().includes('GATE');
    const rows = [];

    for (const row of tickets) {
        const ticketTypeId = row.event_ticket_id || row.ticketTypeId || row.ticket_type_id;
        if (!ticketTypeId) {
            const error = new Error('Each ticket requires event_ticket_id');
            error.statusCode = 422;
            throw error;
        }
        const type = event.ticketTypes.id(ticketTypeId);
        if (!type) {
            const error = new Error('Ticket type not found');
            error.statusCode = 404;
            throw error;
        }

        const unitPrice = complimentary
            ? 0
            : row.price !== undefined && row.price !== null
                ? Math.max(0, Number(row.price) || 0)
                : Math.max(0, Number(type.price) || 0);

        const attendee = {
            first_name: row.first_name || row.firstName || 'Guest',
            last_name: row.last_name || row.lastName || '',
            delivery_method: row.delivery_method || row.deliveryMethod || 'email',
            email: String(row.email || '').trim().toLowerCase(),
            phone: row.phone || ''
        };

        const buyer = await resolveBuyerUser(attendee, user);
        rows.push({
            buyer,
            ticketTypeId: type._id,
            name: type.name,
            unitPrice,
            attendee
        });
    }

    // Inventory is reserved once for the full sale quantity.
    const inventoryLines = [];
    const byType = new Map();
    for (const row of rows) {
        const key = String(row.ticketTypeId);
        const existing = byType.get(key) || {
            ticketTypeId: row.ticketTypeId,
            name: row.name,
            quantity: 0,
            unitPrice: row.unitPrice
        };
        existing.quantity += 1;
        byType.set(key, existing);
    }
    inventoryLines.push(...byType.values());
    await reserveInventory(eventId, inventoryLines, { gate: isGate || complimentary });

    // One booking per buyer so each account owns its tickets.
    const byBuyer = new Map();
    for (const row of rows) {
        const key = String(row.buyer._id);
        const bucket = byBuyer.get(key) || { buyer: row.buyer, lines: [], attendees: [] };
        const typeKey = String(row.ticketTypeId);
        let line = bucket.lines.find((item) => String(item.ticketTypeId) === typeKey && item.unitPrice === row.unitPrice);
        if (!line) {
            line = {
                ticketTypeId: row.ticketTypeId,
                name: row.name,
                quantity: 0,
                unitPrice: row.unitPrice
            };
            bucket.lines.push(line);
        }
        line.quantity += 1;
        bucket.attendees.push(row.attendee);
        byBuyer.set(key, bucket);
    }

    const createdOrders = [];
    const issuedAll = [];
    const purchase_source = isGate ? 'GATE SALE' : complimentary ? 'COMPLIMENTARY' : 'CASH SALE';

    try {
        for (const bucket of byBuyer.values()) {
            const total = bucket.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
            const order = await BookingOrder.create({
                orderNumber: `CASH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
                user: bucket.buyer._id,
                soldBy: user._id,
                event: event._id,
                items: bucket.lines.map((line) => ({
                    ticketTypeId: line.ticketTypeId,
                    name: line.name,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice
                })),
                total,
                currency: 'INR',
                idempotencyKey: `sell-${user._id}-${bucket.buyer._id}-${event._id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
                status: 'paid',
                paymentIntentId: purchase_source
            });
            const issued = await issueTickets(order);
            createdOrders.push(order);
            issuedAll.push(...issued);
        }
    } catch (error) {
        await releaseInventory(eventId, inventoryLines);
        throw error;
    }

    return {
        order: createdOrders[0] || null,
        orders: createdOrders,
        tickets: issuedAll,
        purchase_source,
        attendees: rows.map((row) => row.attendee)
    };
}

export async function listSellableTickets(user, eventId) {
    const { event, handler, isOwner } = await assertSellAccess(user, eventId);
    return {
        event: {
            _id: event._id,
            id: event._id,
            title: event.title,
            startsAt: event.startsAt,
            endsAt: event.endsAt,
            venue: event.venue,
            status: event.status,
            imageUrl: event.imageUrl
        },
        tickets: (event.ticketTypes || []).map((type) => ({
            _id: type._id,
            id: type._id,
            name: type.name,
            description: type.description || '',
            price: type.price,
            door_price: type.doorPrice ?? 0,
            quantity: type.quantity,
            sold: type.sold || 0,
            remaining: Number(type.quantity || 0) === 0
                ? 999999
                : Math.max(0, Number(type.quantity || 0) - Number(type.sold || 0)),
            salesStatus: type.salesStatus,
            currency: type.currency || 'INR',
            type: type.type || null,
            ticket_type: type.ticketType || (Number(type.price) === 0 ? 'free' : 'paid'),
            is_complimentary: /apsession.?complimentary|complimentary/i.test(String(type.name || ''))
                || String(type.type || '').toLowerCase() === 'apsession_complimentary'
                || Number(type.price) === 0 && /complimentary/i.test(String(type.name || ''))
        })),
        handler: handler
            ? {
                userType: handler.userType,
                scannerPermission: handler.scannerPermission
            }
            : null,
        is_owner: isOwner
    };
}
