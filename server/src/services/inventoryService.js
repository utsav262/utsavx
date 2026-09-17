import Event from '../models/Event.js';

export async function reserveInventory(eventId, items, attempt = 0) {
    const event = await Event.findById(eventId);
    if (!event || event.status !== 'published') {
        throw Object.assign(new Error('Event is not available'), { statusCode: 409 });
    }

    for (const item of items) {
        const ticket = event.ticketTypes.id(item.ticketTypeId);
        if (!ticket || ticket.salesStatus !== 'on-sale' || ticket.quantity - ticket.sold < item.quantity) {
            throw Object.assign(new Error(`Insufficient inventory for ${ticket?.name || 'ticket'}`), { statusCode: 409 });
        }
        ticket.sold += item.quantity;
        if (ticket.sold >= ticket.quantity) ticket.salesStatus = 'sold-out';
    }

    if (event.ticketTypes.length && event.ticketTypes.every((ticket) => ticket.sold >= ticket.quantity)) {
        event.status = 'sold-out';
    }

    try {
        await event.save();
        return event;
    } catch (error) {
        if (error.name === 'VersionError' && attempt < 5) {
            return reserveInventory(eventId, items, attempt + 1);
        }
        throw error;
    }
}
