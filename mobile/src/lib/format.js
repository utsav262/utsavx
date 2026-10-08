/** India-first formatting, same defaults as the web app (client/src/lib/locale.js). */
const LOCALE = 'en-IN';
const TIMEZONE = 'Asia/Kolkata';

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function format(value, options) {
  const date = toDate(value);
  if (!date) return null;
  try {
    return date.toLocaleString(LOCALE, { ...options, timeZone: TIMEZONE });
  } catch {
    return date.toLocaleString(LOCALE, options);
  }
}

export function money(value, currency = 'INR') {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount)}`;
  }
}

/** 10 Oct 2026 */
export const formatDate = value =>
  format(value, { day: 'numeric', month: 'short', year: 'numeric' });

/** Sat, 10 Oct 2026, 10:08 pm */
export const formatDateTime = value =>
  format(value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Sat, 10 Oct, 10:08 pm */
export const formatShort = value =>
  format(value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Sat, 10 Oct */
export const formatDay = value =>
  format(value, { weekday: 'short', day: 'numeric', month: 'short' });

/** 10:08 pm */
export const formatTime = value =>
  format(value, { hour: 'numeric', minute: '2-digit' });

/** { day: '10', month: 'OCT' } for date blocks */
export function dateParts(value) {
  const day = format(value, { day: 'numeric' });
  const month = format(value, { month: 'short' });
  return day ? { day, month: String(month).toUpperCase() } : null;
}

export function timeAgo(value) {
  const date = toDate(value);
  if (!date) return '';
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

export const plural = (count, one, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
