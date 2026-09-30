import { useEffect, useState } from 'react';
import { apiClient } from '../api/index.js';
import { unwrap } from './unwrap.js';

/** Shown until the API answers (and if it can't be reached). */
export const DEFAULT_SITE = {
    locations: 'Mumbai · Delhi · Bengaluru',
    support_email: 'hello@utsavx.com',
    support_phone: '+91 99999 99999',
    support_hours: 'Mon–Sat, 10am–7pm IST',
    office_address: 'MXO Pvt Ltd\nBandra West, Mumbai 400050',
    social: { instagram: '', twitter: '', facebook: '', youtube: '', linkedin: '' }
};

let cached = null;
let pending = null;
const listeners = new Set();

/** Fetch once, share the result with every mounted component. */
function refresh() {
    pending = pending || apiClient.siteSettings()
        .then((res) => {
            cached = { ...DEFAULT_SITE, ...unwrap(res, {}) };
            listeners.forEach((fn) => fn(cached));
        })
        .catch(() => {})
        .finally(() => { pending = null; });
    return pending;
}

/** Admin-managed contact details. Refetched when the tab regains focus, so edits show without a reload. */
export function useSiteSettings() {
    const [site, setSite] = useState(cached || DEFAULT_SITE);
    useEffect(() => {
        listeners.add(setSite);
        if (cached) setSite(cached);
        refresh();
        const onVisible = () => document.visibilityState === 'visible' && refresh();
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            listeners.delete(setSite);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, []);
    return site;
}

export const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
