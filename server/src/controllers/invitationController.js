import Event from '../models/Event.js';
import EventHandler from '../models/EventHandler.js';
import Ticket from '../models/Ticket.js';
import BookingOrder from '../models/BookingOrder.js';
import { success } from '../utils/response.js';
import { listSellableTickets, sellTicketOrders } from '../services/sellService.js';

const emailOf = (req) => String(req.user?.email || '').trim().toLowerCase();
const EVENT_POPULATE = 'title slug description category startsAt endsAt venue imageUrl status ticketTypes featured';

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

export function permissionsFor(handler) {
    if (!handler || handler.invitationStatus !== 'A') {
        return {
            canViewDashboard: false,
            canScan: false,
            canSell: false,
            canViewSales: false,
            canManage: false,
            canCheckIn: false
        };
    }

    const type = handler.userType;
    const scanPerm = handler.scannerPermission || 'both';

    if (type === 'Manager') {
        return {
            canViewDashboard: true,
            canScan: true,
            canSell: true,
            canViewSales: true,
            canManage: true,
            canCheckIn: true
        };
    }

    if (type === 'Event_Scanner') {
        const canScan = scanPerm === 'scan_only' || scanPerm === 'both';
        const canSell = scanPerm === 'sell_only' || scanPerm === 'both';
        return {
            canViewDashboard: true,
            canScan,
            canSell,
            canViewSales: canSell,
            canManage: false,
            canCheckIn: canScan
        };
    }

    if (type === 'Ambassador' || type === 'Outlet') {
        return {
            canViewDashboard: true,
            canScan: false,
            canSell: true,
            canViewSales: true,
            canManage: false,
            canCheckIn: false
        };
    }

    return {
        canViewDashboard: true,
        canScan: false,
        canSell: false,
        canViewSales: false,
        canManage: false,
        canCheckIn: false
    };
}

function canScan(handler) {
    return permissionsFor(handler).canCheckIn;
}

async function inviteeHandler(req, handlerId) {
    const handler = await EventHandler.findById(handlerId);
    if (!handler) return { error: ['Invitation not found', 404] };
    if (String(handler.email || '').toLowerCase() !== emailOf(req)) {
        return { error: ['This invitation is not for your account', 403] };
    }
    return { handler };
}

function serializeEvent(event) {
    if (!event || typeof event !== 'object') return event || null;
    return {
        _id: event._id,
        id: event._id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        category: event.category,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        venue: event.venue,
        imageUrl: event.imageUrl,
        status: event.status,
        featured: event.featured,
        ticketTypes: event.ticketTypes || []
    };
}

function serialize(handler) {
    const event = handler.event && typeof handler.event === 'object' ? handler.event : null;
    const permissions = permissionsFor(handler);
    return {
        _id: handler._id,
        id: handler._id,
        email: handler.email,
        userType: handler.userType,
        invitationStatus: handler.invitationStatus,
        scannerPermission: handler.scannerPermission,
        commissionPercentage: handler.commissionPercentage,
        createdAt: handler.createdAt,
        updatedAt: handler.updatedAt,
        event: serializeEvent(event) || handler.event,
        canScan: permissions.canCheckIn,
        permissions
    };
}

async function loadEvent(eventId) {
    return Event.findById(eventId).select(EVENT_POPULATE).lean();
}

export async function listInvitations(req, res) {
    const email = emailOf(req);
    if (!email) return res.status(400).json({ message: 'Account email is required', code: 400 });

    const status = String(req.query.status || '').toUpperCase();
    const query = { email };
    if (['P', 'A', 'D'].includes(status)) query.invitationStatus = status;

    const rows = await EventHandler.find(query)
        .populate('event', EVENT_POPULATE)
        .sort({ createdAt: -1 })
        .lean();

    return success(res, rows.map(serialize), 'Invitations fetched successfully');
}

export async function staffCatalog(req, res) {
    const email = emailOf(req);
    if (!email) return res.status(400).json({ message: 'Account email is required', code: 400 });

    const rows = await EventHandler.find({ email, invitationStatus: 'A' })
        .populate('event', EVENT_POPULATE)
        .sort({ updatedAt: -1 })
        .lean();

    const catalog = rows
        .filter((row) => row.event)
        .map((row) => {
            const item = serialize(row);
            return {
                ...item,
                event: item.event
            };
        });

    return success(res, catalog, 'Staff catalog fetched successfully');
}

export async function staffEventDashboard(req, res) {
    const email = emailOf(req);
    const eventId = req.params.eventId;
    const handler = await EventHandler.findOne({
        event: eventId,
        email,
        invitationStatus: 'A'
    }).lean();

    if (!handler) {
        return res.status(403).json({ message: 'You do not have access to this event dashboard', code: 403 });
    }

    const permissions = permissionsFor(handler);
    if (!permissions.canViewDashboard) {
        return res.status(403).json({ message: 'Dashboard access is not available for this role', code: 403 });
    }

    const event = await loadEvent(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });

    const tickets = await Ticket.find({ event: event._id }).lean();
    const claimed = tickets.filter((ticket) => ticket.status === 'used').length;
    const valid = tickets.filter((ticket) => ticket.status === 'valid').length;

    let sales = null;
    if (permissions.canViewSales) {
        const orders = await BookingOrder.find({ event: event._id, status: 'paid' }).lean();
        const gross = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        const sold = orders.reduce(
            (sum, order) => sum + (order.items || []).reduce((count, item) => count + Number(item.quantity || 0), 0),
            0
        );
        sales = {
            gross_sales: gross,
            tickets_sold: sold,
            orders_count: orders.length
        };
    }

    return success(res, {
        event: serializeEvent(event),
        handler: serialize({ ...handler, event }),
        permissions,
        checkIns: {
            claimed_tickets: claimed,
            unclaimed_tickets: valid,
            total_tickets: tickets.length
        },
        sales
    }, 'Staff event dashboard fetched successfully');
}

export async function acceptInvitation(req, res) {
    const found = await inviteeHandler(req, req.params.id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });

    if (found.handler.invitationStatus === 'A') {
        const event = await loadEvent(found.handler.event);
        return success(res, serialize({ ...found.handler.toObject(), event }), 'Invitation already accepted');
    }
    if (found.handler.invitationStatus === 'D') {
        return res.status(409).json({ message: 'This invitation was declined. Ask the organizer to invite you again.', code: 409 });
    }

    found.handler.invitationStatus = 'A';
    found.handler.user = req.user._id;
    if (!found.handler.firstName && req.user.name) {
        const [first, ...rest] = String(req.user.name).trim().split(/\s+/);
        found.handler.firstName = first;
        if (rest.length) found.handler.lastName = rest.join(' ');
    }
    await found.handler.save();

    const event = await loadEvent(found.handler.event);
    return success(res, serialize({ ...found.handler.toObject(), event }), 'Invitation accepted successfully');
}

export async function rejectInvitation(req, res) {
    const found = await inviteeHandler(req, req.params.id);
    if (found.error) return res.status(found.error[1]).json({ message: found.error[0], code: found.error[1] });

    if (found.handler.invitationStatus === 'A') {
        return res.status(409).json({ message: 'Accepted invitations cannot be declined here. Contact the organizer.', code: 409 });
    }

    found.handler.invitationStatus = 'D';
    found.handler.user = req.user._id;
    await found.handler.save();

    const event = await loadEvent(found.handler.event);
    return success(res, serialize({ ...found.handler.toObject(), event }), 'Invitation declined');
}

export async function scanAsStaff(req, res) {
    const body = req.body || {};
    const eventId = body.event_id || body.eventId;
    const code = normalizeTicketCode(body.code || body.confirmation_id || body.confirmationCode || '');
    const action = body.action || 'validate';

    if (!eventId || !code) {
        return res.status(422).json({ message: 'event_id and code are required', code: 422 });
    }

    const handler = await EventHandler.findOne({
        event: eventId,
        email: emailOf(req),
        invitationStatus: 'A'
    });
    if (!handler || !canScan(handler)) {
        return res.status(403).json({ message: 'You do not have scan access for this event', code: 403 });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });

    const ticket = await Ticket.findOne({ event: event._id, confirmationCode: code });
    if (!ticket) {
        return res.status(422).json({
            status: 'invalid',
            ticket_status: 'invalid',
            message: 'Invalid ticket.',
            code: 422,
            result: {}
        });
    }
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
                event_id: event._id,
                event_title: event.title
            }
        });
    }

    return res.json({
        status: 'success',
        ticket_status: 'valid',
        message: 'Ticket is valid.',
        code: 200,
        result: {
            ticket_id: ticket._id,
            confirmation_id: ticket.confirmationCode,
            event_id: event._id,
            event_title: event.title,
            ticket_type: ticket.ticketType
        }
    });
}

export async function staffSellTickets(req, res) {
    try {
        const data = req.body || {};
        const result = await sellTicketOrders({
            user: req.user,
            eventId: data.event_id || data.eventId,
            tickets: data.tickets || [],
            purchaseSource: data.purchase_source || data.purchaseSource,
            complimentary: Boolean(data.complimentary)
        });
        return success(res, result, 'Tickets sold successfully');
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Sell failed',
            code: error.statusCode || 500
        });
    }
}

export async function staffSellableTickets(req, res) {
    try {
        const result = await listSellableTickets(req.user, req.params.eventId);
        return success(res, result, 'Sellable tickets fetched successfully');
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || 'Could not load tickets',
            code: error.statusCode || 500
        });
    }
}
