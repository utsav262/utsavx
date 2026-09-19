import { canSell, eventRole, isOwnerLike, isScannerLike } from '../dashboard/dashboardUtils.js';

export function isGateWindowOpen(event, now = new Date()) {
    if (!event?.startsAt) return false;
    const start = new Date(event.startsAt);
    const end = new Date(event.endsAt || event.startsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    const gateOpen = new Date(start);
    gateOpen.setDate(gateOpen.getDate() - 1);
    return now >= gateOpen && now <= end;
}

export function gateOpensAt(event) {
    if (!event?.startsAt) return null;
    const start = new Date(event.startsAt);
    if (Number.isNaN(start.getTime())) return null;
    const gateOpen = new Date(start);
    gateOpen.setDate(gateOpen.getDate() - 1);
    return gateOpen;
}

export function sellEntryMode(event) {
    if (!canSell(event)) return null;
    if (isOwnerLike(event)) return 'modal';
    if (isScannerLike(event)) return 'gate';
    return 'digital';
}

export function filterTicketsForMode(tickets, mode) {
    const rows = Array.isArray(tickets) ? tickets : [];
    if (mode === 'complimentary') {
        return rows.filter((tier) => tier.is_complimentary || /complimentary/i.test(tier.name) || Number(tier.price) === 0);
    }
    if (mode === 'gate') {
        return rows.filter(
            (tier) =>
                !tier.is_complimentary &&
                !/complimentary/i.test(tier.name) &&
                Number(tier.door_price ?? tier.doorPrice ?? 0) > 0
        );
    }
    // digital
    return rows.filter((tier) => !tier.is_complimentary && !/complimentary/i.test(tier.name) && Number(tier.price) > 0);
}

export function unitPriceForMode(tier, mode) {
    if (mode === 'complimentary') return 0;
    if (mode === 'gate') return Number(tier.door_price ?? tier.price ?? 0);
    return Number(tier.price ?? 0);
}

export function maxQtyForMode(tier, mode) {
    if (mode === 'gate') return 20;
    if (mode === 'complimentary') return Math.max(1, Number(tier.remaining ?? 20));
    return Math.max(0, Number(tier.remaining ?? 0));
}

export function buildSellPayload({ eventId, mode, selections, attendees, country = 'IN' }) {
    const tickets = [];
    let attendeeIndex = 0;
    for (const selection of selections) {
        for (let i = 0; i < selection.qty; i += 1) {
            const person = attendees[attendeeIndex] || {
                first_name: mode === 'gate' ? 'Gate' : 'Guest',
                last_name: mode === 'gate' ? 'Guest' : '',
                delivery_method: 'email',
                email: '',
                phone: ''
            };
            tickets.push({
                event_ticket_id: selection.ticketId,
                first_name: person.first_name,
                last_name: person.last_name,
                delivery_method: person.delivery_method || 'email',
                email: person.email || '',
                phone: person.phone || '',
                price: selection.unitPrice
            });
            attendeeIndex += 1;
        }
    }

    return {
        event_id: eventId,
        country,
        complimentary: mode === 'complimentary',
        purchase_source: mode === 'gate' ? 'GATE SALE' : undefined,
        tickets
    };
}

export { canSell, eventRole, isOwnerLike };
