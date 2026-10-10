import { money } from '../../lib/money.js';
import { isoToZonedLocal, zonedLocalToIso } from '../manager/create/eventForm.js';

/** Fallback until GET /manager/fees answers; payouts deduct the admin-configured % (default 5). */
export const DEFAULT_SERVICE_FEE_PERCENT = 5;

/**
 * Event facts the ticket editor validates against. Built from a saved event (dashboard) or the
 * create wizard's form; every field is optional so older callers keep working.
 */
export function ticketContextFromEvent(event = {}) {
    const max = event.audience?.maxCapacity;
    return {
        mode: event.registration?.mode || 'paid',
        timeZone: event.timezone || undefined,
        eventEnd: event.endsAt || event.startsAt || null,
        registrationOpens: event.registration?.opensAt || null,
        registrationCloses: event.registration?.closesAt || null,
        maxPeople: max === null || max === undefined || max === '' ? null : Number(max)
    };
}

const zoneOf = (context) => context?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;

export function emptyTicketDraft(context = {}) {
    const free = context.mode === 'free';
    return {
        _id: null,
        name: '',
        description: '',
        hideDescription: false,
        ticketType: free ? 'free' : 'paid',
        quantity: '100',
        admits: '1',
        price: free ? '0' : '499',
        doorPrice: '',
        saleStartsAt: '',
        saleEndsAt: '',
        passServiceFeeToBuyer: false,
        passPaymentFeeToBuyer: false,
        currency: 'INR',
        salesStatus: 'on-sale',
        type: 'gate',
        includesLunch: false
    };
}

/** Sale dates are typed in the event's time zone, not the browser's. */
export function ticketFromApi(row = {}, context = {}) {
    return {
        _id: row._id || row.id || null,
        name: row.name || '',
        description: row.description || '',
        hideDescription: Boolean(row.hideDescription ?? row.hide_description),
        ticketType: row.ticketType || row.ticket_type || (Number(row.price) === 0 ? 'free' : 'paid'),
        quantity: String(row.quantity ?? 0),
        admits: String(row.admits ?? 1),
        price: String(row.price ?? 0),
        doorPrice: row.doorPrice != null || row.door_price != null
            ? String(row.doorPrice ?? row.door_price)
            : '',
        saleStartsAt: isoToZonedLocal(row.saleStartsAt || row.sale_start, zoneOf(context)),
        saleEndsAt: isoToZonedLocal(row.saleEndsAt || row.sale_end, zoneOf(context)),
        passServiceFeeToBuyer: Boolean(row.passServiceFeeToBuyer ?? row.pass_service_fee_to_buyer),
        passPaymentFeeToBuyer: Boolean(row.passPaymentFeeToBuyer ?? row.pass_payment_fee_to_buyer),
        currency: row.currency || 'INR',
        salesStatus: row.salesStatus || 'on-sale',
        type: row.type || 'gate',
        includesLunch: Boolean(row.includesLunch ?? row.includes_lunch),
        sold: row.sold || 0,
        is_complimentary: isSystemComplimentary(row)
    };
}

export function isSystemComplimentary(ticket) {
    if (!ticket) return false;
    if (ticket.is_complimentary) return true;
    const name = String(ticket.name || '');
    const type = String(ticket.type || '');
    return /^complimentary$/i.test(name.trim()) || type.toLowerCase() === 'complimentary';
}

export function isEditableTicket(ticket) {
    return !isSystemComplimentary(ticket);
}

export function isNonComplimentary(ticket) {
    return !isSystemComplimentary(ticket) && !/^complimentary$/i.test(String(ticket.name || ''));
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * What actually happens to money, matching checkout and payouts: the buyer pays exactly the
 * ticket price (no booking fee is added) and the platform keeps `feePercent` of it. Gate sales
 * are paid in cash, so the host remits the same % of the door price in settlements.
 */
export function feePreview(draft, feePercent = DEFAULT_SERVICE_FEE_PERCENT) {
    const rate = (Number(feePercent) || 0) / 100;
    const price = Number(draft.ticketType === 'free' ? 0 : draft.price) || 0;
    const door = draft.ticketType === 'free' || draft.doorPrice === '' || draft.doorPrice == null ? 0 : Number(draft.doorPrice) || 0;
    const quantity = Math.max(0, Math.floor(Number(draft.quantity) || 0));
    const fee = round2(price * rate);
    return {
        feePercent: Number(feePercent) || 0,
        price,
        buyerPays: price,
        fee,
        hostReceives: round2(price - fee),
        door,
        doorFee: round2(door * rate),
        // Sold-out estimate for limited tiers (null when unlimited or free).
        tierGross: quantity && price ? round2(quantity * price) : null,
        tierHostReceives: quantity && price ? round2(quantity * (price - fee)) : null
    };
}

/** People a tier can admit: tickets × people per ticket (null = unlimited). */
export function peopleCapacity(ticket) {
    const qty = Math.max(0, Math.floor(Number(ticket.quantity) || 0));
    return qty ? qty * toAdmits(ticket.admits) : null;
}

/** Validates one tier against the event: sale window, and the max-participants cap across all tiers. */
export function validateTicketDraft(draft, context = {}, otherTickets = []) {
    if (!String(draft.name || '').trim()) return 'Ticket name is required.';
    const qty = draft.quantity === '' ? NaN : Number(draft.quantity);
    if (Number.isNaN(qty) || qty < 0) return 'Quantity must be 0 (unlimited) or a positive number.';
    const admits = Number(draft.admits);
    if (!Number.isInteger(admits) || admits < 1 || admits > 20) return 'People per ticket must be a whole number from 1 to 20.';
    if (draft.ticketType === 'paid') {
        const price = Number(draft.price);
        if (!price || price <= 0) return 'Paid tickets need a price greater than 0.';
    }
    const zone = zoneOf(context);
    const start = zonedLocalToIso(draft.saleStartsAt, zone);
    const end = zonedLocalToIso(draft.saleEndsAt, zone);
    if (start && end && new Date(end) <= new Date(start)) return 'Sale end must be after sale start.';
    if (end && context.eventEnd && new Date(end) > new Date(context.eventEnd)) return 'Ticket sales must end before the event ends.';
    if (context.maxPeople != null && isNonComplimentary(draft)) {
        const tiers = [...otherTickets.filter((t) => String(t._id) !== String(draft._id) && isNonComplimentary(t)), draft];
        if (tiers.some((t) => peopleCapacity(t) === null)) {
            return `This event allows at most ${context.maxPeople} participants — set a quantity instead of unlimited.`;
        }
        const total = tiers.reduce((sum, t) => sum + peopleCapacity(t), 0);
        if (total > context.maxPeople) {
            return `All tiers together admit ${total} people, over the event maximum of ${context.maxPeople}.`;
        }
    }
    return '';
}

export function toApiPayload(draft, eventId, context = {}) {
    const ticketType = draft.ticketType === 'free' ? 'free' : 'paid';
    const price = ticketType === 'free' ? 0 : Number(draft.price) || 0;
    return {
        eventId,
        event_id: eventId,
        name: String(draft.name).trim(),
        description: String(draft.description || '').trim(),
        hide_description: Boolean(draft.hideDescription),
        ticket_type: ticketType,
        ticketType,
        price,
        door_price: draft.doorPrice === '' || draft.doorPrice == null
            ? undefined
            : Number(draft.doorPrice) || 0,
        quantity: Math.max(0, Math.floor(Number(draft.quantity) || 0)),
        admits: toAdmits(draft.admits),
        currency: draft.currency || 'INR',
        salesStatus: draft.salesStatus || 'on-sale',
        type: draft.type || 'gate',
        // null clears a previously set date on edit.
        sale_start: zonedLocalToIso(draft.saleStartsAt, zoneOf(context)),
        sale_end: zonedLocalToIso(draft.saleEndsAt, zoneOf(context)),
        pass_service_fee_to_buyer: Boolean(draft.passServiceFeeToBuyer),
        pass_payment_fee_to_buyer: Boolean(draft.passPaymentFeeToBuyer),
        includes_lunch: Boolean(draft.includesLunch)
    };
}

export function toLocalTicket(draft) {
    const ticketType = draft.ticketType === 'free' ? 'free' : 'paid';
    return {
        _id: draft._id || undefined,
        name: String(draft.name).trim(),
        description: String(draft.description || '').trim(),
        hideDescription: Boolean(draft.hideDescription),
        ticketType,
        price: ticketType === 'free' ? 0 : Number(draft.price) || 0,
        doorPrice: draft.doorPrice === '' || draft.doorPrice == null ? 0 : Number(draft.doorPrice) || 0,
        quantity: Math.max(0, Math.floor(Number(draft.quantity) || 0)),
        admits: toAdmits(draft.admits),
        currency: draft.currency || 'INR',
        salesStatus: draft.salesStatus || 'on-sale',
        type: draft.type || 'gate',
        saleStartsAt: draft.saleStartsAt || null,
        saleEndsAt: draft.saleEndsAt || null,
        passServiceFeeToBuyer: Boolean(draft.passServiceFeeToBuyer),
        passPaymentFeeToBuyer: Boolean(draft.passPaymentFeeToBuyer),
        includesLunch: Boolean(draft.includesLunch),
        sold: draft.sold || 0,
        is_complimentary: false
    };
}

/** People per ticket, 1–20 (group / family passes). */
export function toAdmits(value) {
    return Math.min(20, Math.max(1, Math.floor(Number(value)) || 1));
}

/** "Admits 3" for group passes, empty for normal one-person tickets. */
export function formatAdmits(value) {
    const admits = toAdmits(value);
    return admits > 1 ? `Admits ${admits}` : '';
}

export function formatQty(quantity) {
    const qty = Number(quantity);
    if (!qty) return 'Unlimited';
    return String(qty);
}

export function formatTicketPrice(ticket) {
    const type = ticket.ticketType || ticket.ticket_type;
    if (type === 'free' || Number(ticket.price) === 0) return 'Free';
    return money(ticket.price);
}
