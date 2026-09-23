import mongoose from 'mongoose';
import Event from '../models/Event.js';

function asObjectId(id) {
    return new mongoose.Types.ObjectId(String(id));
}

function insufficient(ticketName) {
    return Object.assign(new Error(`Insufficient inventory for ${ticketName || 'ticket'}`), { statusCode: 409 });
}

/**
 * Atomically increment sold for one ticket type when capacity allows.
 * Uses a query-time $expr capacity check so concurrent checkouts cannot oversell.
 */
export async function reserveTicketType(eventId, ticketTypeId, quantity, { gate = false } = {}) {
    const qty = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!qty) return Event.findById(eventId);

    const eventOid = asObjectId(eventId);
    const typeOid = asObjectId(ticketTypeId);
    const statusFilter = gate
        ? { status: { $in: ['published', 'sold-out'] } }
        : { status: 'published' };

    const typeCond = gate
        ? { $eq: ['$$t._id', typeOid] }
        : {
            $and: [
                { $eq: ['$$t._id', typeOid] },
                { $eq: ['$$t.salesStatus', 'on-sale'] },
                {
                    $or: [
                        { $eq: ['$$t.quantity', 0] },
                        {
                            $lte: [
                                { $add: [{ $ifNull: ['$$t.sold', 0] }, qty] },
                                '$$t.quantity'
                            ]
                        }
                    ]
                }
            ]
        };

    const updated = await Event.findOneAndUpdate(
        {
            _id: eventOid,
            ...statusFilter,
            $expr: {
                $gt: [
                    {
                        $size: {
                            $filter: {
                                input: '$ticketTypes',
                                as: 't',
                                cond: typeCond
                            }
                        }
                    },
                    0
                ]
            }
        },
        { $inc: { 'ticketTypes.$[tt].sold': qty } },
        {
            arrayFilters: [{ 'tt._id': typeOid }],
            new: true
        }
    );

    if (!updated) {
        const event = await Event.findById(eventOid).lean();
        const ticket = event?.ticketTypes?.find((row) => String(row._id) === String(ticketTypeId));
        if (!event || (!gate && event.status !== 'published')) {
            throw Object.assign(new Error('Event is not available'), { statusCode: 409 });
        }
        throw insufficient(ticket?.name);
    }

    if (!gate) await syncSoldOutFlags(updated._id);
    return Event.findById(updated._id);
}

/** Decrement sold (release a hold or undo a failed multi-type reserve). */
export async function releaseTicketType(eventId, ticketTypeId, quantity) {
    const qty = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!qty) return null;

    const typeOid = asObjectId(ticketTypeId);
    const updated = await Event.findOneAndUpdate(
        { _id: asObjectId(eventId) },
        {
            $inc: { 'ticketTypes.$[tt].sold': -qty },
            $set: { 'ticketTypes.$[tt].salesStatus': 'on-sale' }
        },
        {
            arrayFilters: [
                {
                    'tt._id': typeOid,
                    'tt.sold': { $gte: qty }
                }
            ],
            new: true
        }
    );

    if (!updated) return null;

    // Re-open sold-out events when stock returns.
    if (updated.status === 'sold-out') {
        const hasStock = updated.ticketTypes.some((ticket) => {
            const unlimited = Number(ticket.quantity || 0) === 0;
            return unlimited || Number(ticket.sold || 0) < Number(ticket.quantity || 0);
        });
        if (hasStock) {
            await Event.updateOne({ _id: updated._id, status: 'sold-out' }, { $set: { status: 'published' } });
        }
    }

    return Event.findById(updated._id);
}

async function syncSoldOutFlags(eventId) {
    const event = await Event.findById(eventId);
    if (!event) return;

    let dirty = false;
    for (const ticket of event.ticketTypes) {
        const limited = Number(ticket.quantity || 0) > 0;
        if (limited && ticket.sold >= ticket.quantity && ticket.salesStatus !== 'sold-out') {
            ticket.salesStatus = 'sold-out';
            dirty = true;
        }
    }

    const allLimitedSoldOut = event.ticketTypes.length > 0
        && event.ticketTypes.every((ticket) => Number(ticket.quantity) > 0 && ticket.sold >= ticket.quantity);

    if (allLimitedSoldOut && event.status === 'published') {
        event.status = 'sold-out';
        dirty = true;
    }

    if (dirty) {
        try {
            await event.save();
        } catch {
            /* flag races are non-critical */
        }
    }
}

/**
 * Reserve inventory for an online checkout (or door sell when gate=true).
 * Applies each line atomically; rolls back earlier lines if a later line fails.
 */
export async function reserveInventory(eventId, items, { gate = false } = {}) {
    const lines = (items || []).map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
        name: item.name
    })).filter((item) => item.quantity > 0);

    if (!lines.length) {
        const event = await Event.findById(eventId);
        if (!event || (!gate && event.status !== 'published')) {
            throw Object.assign(new Error('Event is not available'), { statusCode: 409 });
        }
        return event;
    }

    const reserved = [];
    try {
        let event = null;
        for (const line of lines) {
            event = await reserveTicketType(eventId, line.ticketTypeId, line.quantity, { gate });
            reserved.push(line);
        }
        return event;
    } catch (error) {
        for (const line of reserved.reverse()) {
            try {
                await releaseTicketType(eventId, line.ticketTypeId, line.quantity);
            } catch {
                /* best-effort rollback */
            }
        }
        throw error;
    }
}

export async function releaseInventory(eventId, items) {
    const lines = (items || []).map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: Math.max(0, Math.floor(Number(item.quantity) || 0))
    })).filter((item) => item.ticketTypeId && item.quantity > 0);

    for (const line of lines) {
        await releaseTicketType(eventId, line.ticketTypeId, line.quantity);
    }
}
