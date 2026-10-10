import Ticket from '../models/Ticket.js';
import { admitsOf, enteredOf } from './admits.js';

export const CHECKPOINTS = ['entry', 'lunch'];

/** Tier a ticket was issued from: by id, or by name for passes issued before ids were stored. */
export function tierOf(event, ticket) {
    const tiers = event?.ticketTypes || [];
    if (ticket.ticketTypeId) {
        const byId = tiers.find((tier) => String(tier._id) === String(ticket.ticketTypeId));
        if (byId) return byId;
    }
    return tiers.find((tier) => tier.name === ticket.ticketType) || null;
}

const reject = (status, message, result = {}) => ({ httpStatus: 422, body: { status, ticket_status: status, message, code: 422, result } });

/**
 * Lunch counter scan for the same QR used at the gate. Rules:
 * the tier must include lunch, the ticket must already be checked in at entry,
 * and lunch is served once per ticket, for up to the people who actually entered.
 * `action` is 'validate' (preview) or 'scan' (serve). Returns { httpStatus, body }.
 */
export async function lunchCheckpoint({ event, ticket, body = {}, action = 'validate' }) {
    const base = {
        ticket_id: ticket._id,
        confirmation_id: ticket.confirmationCode,
        ticket_type: ticket.ticketType,
        checkpoint: 'lunch'
    };
    if (ticket.status === 'cancelled') return reject('payment_not_done', 'Ticket is not valid.', base);
    if (!tierOf(event, ticket)?.includesLunch) return reject('not_included', 'This ticket does not include lunch.', base);
    if (ticket.status !== 'used') return reject('not_checked_in', 'Check in at the entrance before lunch.', base);
    if (ticket.lunchServedAt) {
        return reject('already_claimed', 'Lunch already served for this ticket.', { ...base, served_at: ticket.lunchServedAt, lunch_served: ticket.lunchServed });
    }

    const eligible = enteredOf(ticket);
    const result = { ...base, admits: admitsOf(ticket), people_entered: eligible };
    if (action !== 'scan') {
        return { httpStatus: 200, body: { status: 'success', ticket_status: 'valid', message: `Lunch included for ${eligible} ${eligible === 1 ? 'person' : 'people'}.`, code: 200, result } };
    }

    const raw = body.people_served ?? body.peopleServed;
    const people = raw === undefined || raw === null || raw === '' ? eligible : Number(raw);
    if (!Number.isInteger(people) || people < 1 || people > eligible) {
        return reject('invalid_count', eligible > 1 ? `Serve lunch to 1 to ${eligible} people.` : 'This ticket gets lunch for 1 person.', result);
    }
    const served = await Ticket.findOneAndUpdate(
        { _id: ticket._id, status: 'used', lunchServedAt: null },
        { $set: { lunchServedAt: new Date(), lunchServed: people } },
        { new: true }
    );
    if (!served) return reject('already_claimed', 'Lunch already served for this ticket.', base);
    return {
        httpStatus: 200,
        body: {
            status: 'success',
            ticket_status: 'served',
            message: `Lunch served for ${people} ${people === 1 ? 'person' : 'people'}.`,
            code: 200,
            result: { ...result, lunch_served: people, served_at: served.lunchServedAt }
        }
    };
}

/** Lunch totals for check-in stats: people eligible (entered on lunch tiers) and people served. */
export function lunchStats(event, tickets) {
    let eligible = 0;
    let served = 0;
    let included = 0;
    for (const ticket of tickets) {
        if (!tierOf(event, ticket)?.includesLunch || ticket.status === 'cancelled') continue;
        included += admitsOf(ticket);
        eligible += enteredOf(ticket);
        served += Number(ticket.lunchServed) || 0;
    }
    return { lunch_included_people: included, lunch_eligible_people: eligible, lunch_served_people: served };
}
