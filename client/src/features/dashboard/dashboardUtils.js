/** Per-event role helpers for Dashboard home + EventDashboard hub. */

export function eventRole(event) {
    if (event?.is_owner || event?.event_handler_type === 'Owner') return 'owner';
    const type = event?.event_handler_type;
    if (type === 'Manager') return 'manager';
    if (type === 'Ambassador') return 'ambassador';
    if (type === 'Outlet') return 'outlet';
    if (type === 'Event_Scanner') return 'scanner';
    return 'viewer';
}

export function roleBadge(event) {
    const role = eventRole(event);
    if (role === 'owner') return 'Owner';
    if (role === 'manager') return 'Manager';
    if (role === 'ambassador') return 'Ambassador';
    if (role === 'outlet') return 'Outlet';
    if (role === 'scanner') return 'Event Scanner';
    return 'Staff';
}

export function scannerPermission(event) {
    return event?.scanner_permission || 'both';
}

export function canScan(event) {
    const role = eventRole(event);
    if (role === 'owner' || role === 'manager') return true;
    if (role !== 'scanner') return false;
    const perm = scannerPermission(event);
    return perm === 'scan_only' || perm === 'both';
}

export function canSell(event) {
    const role = eventRole(event);
    if (role === 'owner' || role === 'manager' || role === 'ambassador' || role === 'outlet') return true;
    if (role !== 'scanner') return false;
    const perm = scannerPermission(event);
    return perm === 'sell_only' || perm === 'both';
}

export function canOpenDashboard(event) {
    return Boolean(event?.is_owner || event?.event_handler_type);
}

export function isOwnerLike(event) {
    const role = eventRole(event);
    return role === 'owner' || role === 'manager';
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
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80'
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
