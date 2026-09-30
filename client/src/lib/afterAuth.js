/** Where to send someone right after they sign in (or open a guest-only page while signed in). */
export function destinationAfterAuth(user, from) {
    // Guards pass a location object; links pass a path string.
    const path = typeof from === 'string' ? from : from?.pathname ? `${from.pathname}${from.search || ''}` : '';
    if (path && !['/login', '/organizer'].includes(path) && !path.startsWith('/manager/')) return path;
    if (user?.role === 'admin') return '/admin-legacy';
    if (user?.role === 'organizer') return '/dashboard';
    // Pure customers land on Discover home — not Invitations / staff dashboard.
    if (user?.role === 'customer' && (user?.staffRole || user?.staffEvents?.length)) return '/dashboard';
    return '/';
}
