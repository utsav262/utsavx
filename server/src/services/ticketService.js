import crypto from 'node:crypto';
import Ticket from '../models/Ticket.js';

export async function issueTickets(order) {
    const existing = await Ticket.exists({ order: order._id });
    if (existing) return [];

    const tickets = [];
    for (const item of order.items) {
        for (let index = 0; index < item.quantity; index += 1) {
            const confirmationCode = `${order.orderNumber}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            tickets.push({
                order: order._id,
                owner: order.user,
                event: order.event,
                ticketType: item.name,
                confirmationCode,
                qrPayload: JSON.stringify({ confirmationCode, order: order.orderNumber })
            });
        }
    }

    if (!tickets.length) return [];
    return Ticket.insertMany(tickets, { ordered: true });
}
