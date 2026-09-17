import { APP_LOCALE, APP_TIMEZONE } from './locale.js';

function toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** e.g. 10 Oct 2026 */
export function formatDate(value) {
    const date = toDate(value);
    if (!date) return null;
    return date.toLocaleDateString(APP_LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: APP_TIMEZONE
    });
}

/** e.g. Sat, 10 Oct 2026, 10:08 pm */
export function formatDateTime(value) {
    const date = toDate(value);
    if (!date) return null;
    return date.toLocaleString(APP_LOCALE, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: APP_TIMEZONE
    });
}

/** e.g. Saturday, 10 October 2026 at 10:08 pm */
export function formatDateTimeLong(value) {
    const date = toDate(value);
    if (!date) return null;
    return date.toLocaleString(APP_LOCALE, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: APP_TIMEZONE
    });
}
