import { APP_CURRENCY, APP_LOCALE } from './locale.js';

export function money(value, currency = APP_CURRENCY) {
    return new Intl.NumberFormat(APP_LOCALE, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}
