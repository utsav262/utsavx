import { money } from '../../lib/money.js';

export const SERVICE_FEE_RATE = 0.05;
export const PAYMENT_FEE_RATE = 0.02;

export function emptyTicketDraft() {
    return {
        _id: null,
        name: '',
        description: '',
        hideDescription: false,
        ticketType: 'paid',
        quantity: '100',
        price: '499',
        doorPrice: '',
        saleStartsAt: '',
        saleEndsAt: '',
        passServiceFeeToBuyer: false,
        passPaymentFeeToBuyer: false,
        currency: 'INR',
        salesStatus: 'on-sale',
        type: 'gate'
    };
}

export function ticketFromApi(row = {}) {
    return {
        _id: row._id || row.id || null,
        name: row.name || '',
        description: row.description || '',
        hideDescription: Boolean(row.hideDescription ?? row.hide_description),
        ticketType: row.ticketType || row.ticket_type || (Number(row.price) === 0 ? 'free' : 'paid'),
        quantity: String(row.quantity ?? 0),
        price: String(row.price ?? 0),
        doorPrice: row.doorPrice != null || row.door_price != null
            ? String(row.doorPrice ?? row.door_price)
            : '',
        saleStartsAt: toLocalInput(row.saleStartsAt || row.sale_start),
        saleEndsAt: toLocalInput(row.saleEndsAt || row.sale_end),
        passServiceFeeToBuyer: Boolean(row.passServiceFeeToBuyer ?? row.pass_service_fee_to_buyer),
        passPaymentFeeToBuyer: Boolean(row.passPaymentFeeToBuyer ?? row.pass_payment_fee_to_buyer),
        currency: row.currency || 'INR',
        salesStatus: row.salesStatus || 'on-sale',
        type: row.type || 'gate',
        sold: row.sold || 0,
        is_complimentary: isSystemComplimentary(row)
    };
}

function toLocalInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isSystemComplimentary(ticket) {
    if (!ticket) return false;
    if (ticket.is_complimentary) return true;
    const name = String(ticket.name || '');
    const type = String(ticket.type || '');
    return /apsession.?complimentary/i.test(name) || type.toLowerCase() === 'apsession_complimentary';
}

export function isEditableTicket(ticket) {
    return !isSystemComplimentary(ticket);
}

export function isNonComplimentary(ticket) {
    return !isSystemComplimentary(ticket) && !/^complimentary$/i.test(String(ticket.name || ''));
}

export function hostReceives(draft) {
    const price = Number(draft.ticketType === 'free' ? 0 : draft.price) || 0;
    if (price <= 0) return 0;
    const service = draft.passServiceFeeToBuyer ? 0 : price * SERVICE_FEE_RATE;
    const payment = draft.passPaymentFeeToBuyer ? 0 : price * PAYMENT_FEE_RATE;
    return Math.max(0, price - service - payment);
}

export function feePreview(draft) {
    const price = Number(draft.ticketType === 'free' ? 0 : draft.price) || 0;
    const service = price * SERVICE_FEE_RATE;
    const payment = price * PAYMENT_FEE_RATE;
    return {
        price,
        service,
        payment,
        buyerPays: price
            + (draft.passServiceFeeToBuyer ? service : 0)
            + (draft.passPaymentFeeToBuyer ? payment : 0),
        hostReceives: hostReceives(draft)
    };
}

export function validateTicketDraft(draft) {
    if (!String(draft.name || '').trim()) return 'Ticket name is required.';
    const qty = draft.quantity === '' ? NaN : Number(draft.quantity);
    if (Number.isNaN(qty) || qty < 0) return 'Quantity must be 0 (unlimited) or a positive number.';
    if (draft.ticketType === 'paid') {
        const price = Number(draft.price);
        if (!price || price <= 0) return 'Paid tickets need a price greater than 0.';
    }
    if (draft.saleStartsAt && draft.saleEndsAt && new Date(draft.saleEndsAt) < new Date(draft.saleStartsAt)) {
        return 'Sale end must be after sale start.';
    }
    return '';
}

export function toApiPayload(draft, eventId) {
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
        currency: draft.currency || 'INR',
        salesStatus: draft.salesStatus || 'on-sale',
        type: draft.type || 'gate',
        sale_start: draft.saleStartsAt || undefined,
        sale_end: draft.saleEndsAt || undefined,
        pass_service_fee_to_buyer: Boolean(draft.passServiceFeeToBuyer),
        pass_payment_fee_to_buyer: Boolean(draft.passPaymentFeeToBuyer)
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
        currency: draft.currency || 'INR',
        salesStatus: draft.salesStatus || 'on-sale',
        type: draft.type || 'gate',
        saleStartsAt: draft.saleStartsAt || null,
        saleEndsAt: draft.saleEndsAt || null,
        passServiceFeeToBuyer: Boolean(draft.passServiceFeeToBuyer),
        passPaymentFeeToBuyer: Boolean(draft.passPaymentFeeToBuyer),
        sold: draft.sold || 0,
        is_complimentary: false
    };
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
