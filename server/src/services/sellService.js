import crypto from 'node:crypto';
import Event from '../models/Event.js';
import EventHandler from '../models/EventHandler.js';
import BookingOrder from '../models/BookingOrder.js';
import { issueTickets } from './ticketService.js';

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

async function applyInventory(event, lines, { gate = false } = {}, attempt = 0) {
    for (const line of lines) {
        const ticket = event.ticketTypes.id(line.ticketTypeId);
        if (!ticket) {
            const error = new Error('Ticket type not found');
            error.statusCode = 404;
            throw error;
        }
        const unlimited = Number(ticket.quantity || 0) === 0;
        if (!gate) {
            if (ticket.salesStatus === 'paused') {
                const error = new Error(`Insufficient inventory for ${ticket.name}`);
                error.statusCode = 409;
                throw error;
            }
            if (!unlimited) {
                const remaining = Number(ticket.quantity || 0) - Number(ticket.sold || 0);
                if (remaining < line.quantity) {
                    const error = new Error(`Insufficient inventory for ${ticket.name}`);
                    error.statusCode = 409;
                    throw error;
                }
            }
        }
        ticket.sold = Number(ticket.sold || 0) + line.quantity;
        if (!gate && !unlimited && ticket.sold >= ticket.quantity) ticket.salesStatus = 'sold-out';
    }

    if (
        !gate &&
        event.ticketTypes.length &&
        event.ticketTypes.every((ticket) => Number(ticket.quantity) > 0 && ticket.sold >= ticket.quantity)
    ) {
        event.status = 'sold-out';
    }

    try {
        await event.save();
        return event;
    } catch (error) {
        if (error.name === 'VersionError' && attempt < 5) {
            const fresh = await Event.findById(event._id);
            return applyInventory(fresh, lines, { gate }, attempt + 1);
        }
        throw error;
    }
}

/**
 * Cash / door sell used by owner and accepted handlers.
 * tickets[]: { event_ticket_id, first_name, last_name, delivery_method, email, phone, price? }
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
    const grouped = new Map();

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

        const key = String(type._id);
        const existing = grouped.get(key) || {
            ticketTypeId: type._id,
            name: type.name,
            quantity: 0,
            unitPrice,
            attendees: []
        };
        existing.quantity += 1;
        existing.attendees.push({
            first_name: row.first_name || row.firstName || 'Guest',
            last_name: row.last_name || row.lastName || '',
            delivery_method: row.delivery_method || row.deliveryMethod || 'email',
            email: row.email || '',
            phone: row.phone || ''
        });
        grouped.set(key, existing);
    }

    const lines = [...grouped.values()];
    await applyInventory(event, lines, { gate: isGate || complimentary });

    const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const order = await BookingOrder.create({
        orderNumber: `CASH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        user: user._id,
        event: event._id,
        items: lines.map((line) => ({
            ticketTypeId: line.ticketTypeId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice
        })),
        total,
        currency: 'INR',
        idempotencyKey: `sell-${user._id}-${event._id}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        status: 'paid',
        paymentIntentId: isGate ? 'GATE SALE' : complimentary ? 'COMPLIMENTARY' : 'CASH SALE'
    });

    const issued = await issueTickets(order);
    return {
        order,
        tickets: issued,
        purchase_source: isGate ? 'GATE SALE' : complimentary ? 'COMPLIMENTARY' : 'CASH SALE',
        attendees: lines.flatMap((line) => line.attendees)
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
