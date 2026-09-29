import { EVENT_PLACEHOLDER } from '../../lib/placeholder.js';

/** Per-event role helpers for Dashboard home + EventDashboard hub. */

/** Normalized handler type: event_handler_type ?? eventHandlerType ?? handler_type, trimmed + lowercase. */
export function handlerType(event) {
    return String(event?.event_handler_type ?? event?.eventHandlerType ?? event?.handler_type ?? '')
        .trim()
        .toLowerCase();
}

const TRUTHY = [true, 1, '1'];

export function isEventOwner(event) {
    return TRUTHY.includes(event?.is_owner) || TRUTHY.includes(event?.isOwner) || handlerType(event) === 'owner';
}

export function isEventManager(event) {
    return handlerType(event).includes('manager');
}

export function isEventScanner(event) {
    const raw = handlerType(event);
    return ['scanner', 'event_scanner', 'gate staff', 'gate_staff'].some((key) => raw.includes(key));
}

export function isEventAmbassador(event) {
    const raw = handlerType(event);
    return raw.includes('ambassador') && !raw.includes('outlet');
}

export function isEventOutlet(event) {
    return handlerType(event).includes('outlet');
}

/** Per-event role. Owner takes priority over every handler type. */
export function eventRole(event) {
    if (isEventOwner(event)) return 'owner';
    if (isEventManager(event)) return 'manager';
    if (isEventScanner(event)) return 'scanner';
    if (isEventOutlet(event)) return 'outlet';
    if (isEventAmbassador(event)) return 'ambassador';
    return 'viewer';
}

/** Badge for event cards. Owners get no badge. */
export function roleBadge(event) {
    const role = eventRole(event);
    if (role === 'manager') return 'Manager';
    if (role === 'scanner') return 'Gate Staff';
    if (role === 'ambassador') return 'Ambassador';
    if (role === 'outlet') return 'Outlet';
    return '';
}

/** scan_only | sell_only | both — the backend defaults scanners to scan_only. */
export function scannerPermission(event) {
    const raw = String(event?.scanner_permission ?? event?.scannerPermission ?? '').trim().toLowerCase();
    return ['scan_only', 'sell_only', 'both'].includes(raw) ? raw : 'scan_only';
}

export function canScannerScan(permission) {
    return permission === 'scan_only' || permission === 'both';
}

export function canScannerSell(permission) {
    return permission === 'sell_only' || permission === 'both';
}

/** Owner / Manager: drafts, create, full dashboard, payout. */
export function canManageEvent(event) {
    const role = eventRole(event);
    return role === 'owner' || role === 'manager';
}

export function canScan(event) {
    const role = eventRole(event);
    if (role === 'owner' || role === 'manager') return true;
    return role === 'scanner' && canScannerScan(scannerPermission(event));
}

export function canSell(event) {
    const role = eventRole(event);
    if (role === 'scanner') return canScannerSell(scannerPermission(event));
    return role !== 'viewer';
}

/** Price on the card: everyone except gate staff who can't sell. */
export function canSeePrice(event) {
    return eventRole(event) !== 'scanner' || canScannerSell(scannerPermission(event));
}

/** Owner, Manager, or the event host may upgrade / unlock. */
export function canUpgradeEvent(event, authUserId) {
    if (canManageEvent(event)) return true;
    const hostId = event?.host_id ?? event?.organizer?._id ?? event?.organizer;
    return Boolean(hostId && authUserId && String(hostId) === String(authUserId));
}

/** Only the owner edits / unpublishes / deletes, and never once the event is past. */
export function canEditEvent(event, isPast) {
    return eventRole(event) === 'owner' && !isPast;
}

/** Background ticket sync: everyone except ambassadors / outlets. */
export function shouldSyncEventTickets(event) {
    const role = eventRole(event);
    return role === 'owner' || role === 'manager' || role === 'scanner';
}

export function isEventInPast(event, tab) {
    if (tab === 'past') return true;
    if (tab === 'live' || tab === 'draft') return false;
    const raw = event?.endsAt || event?.end_date || event?.startsAt || event?.date;
    const date = raw ? new Date(raw) : null;
    return Boolean(date && !Number.isNaN(date.getTime()) && date < new Date());
}

/** Email/password signups (signup_type 1) must verify; social signups skip the check. */
export function isUserEmailVerified(user) {
    if (!user) return true;
    if (Number(user.signup_type ?? 0) !== 1) return true;
    const verifiedAt = user.email_verified_at ?? user.emailVerifiedAt;
    if (verifiedAt && String(verifiedAt) !== 'null') return true;
    return [true, 1, '1', 'true'].includes(user.email_verified ?? user.emailVerified ?? user.isEmailVerified);
}

export function canOpenDashboard(event) {
    return eventRole(event) !== 'viewer';
}

export function isOwnerLike(event) {
    return canManageEvent(event);
}

export function isScannerLike(event) {
    return eventRole(event) === 'scanner';
}

export function isAmbassadorLike(event) {
    const role = eventRole(event);
    return role === 'ambassador' || role === 'outlet';
}

export function eventCover(event) {
    return (
        event?.cover_image ||
        event?.imageUrl ||
        event?.image ||
        event?.horizontal_flyer ||
        EVENT_PLACEHOLDER
    );
}

export function matchesSearch(event, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const hay = [
        event?.title,
        event?.name,
        event?.venue?.name,
        event?.venue?.city,
        event?.city,
        event?.event_handler_type,
        roleBadge(event)
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return hay.includes(q);
}

export function dashboardNavPayload(event, tab = 'live') {
    return {
        eventId: event._id || event.id,
        eventItem: event,
        name: event.title || event.name,
        type: tab,
        role: eventRole(event)
    };
}
