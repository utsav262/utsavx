import crypto from 'node:crypto';
import {
    DETAIL_TRACKS,
    EVENT_FORMATS,
    LIMITS,
    REGISTRATION_MODES,
    VISIBILITIES,
    findCategory,
    findOrganizerType,
    tracksFor
} from '../config/eventTaxonomy.js';

/** Fields an organizer may write on an event (everything else — featured, counters, organizer — is server-owned). */
export const EVENT_WRITABLE = [
    'title', 'slug', 'description', 'category', 'subcategory', 'tags', 'venue', 'startsAt', 'endsAt', 'imageUrl', 'status',
    'ticketTypes', 'organizerType', 'organizationName', 'eventFormat', 'visibility', 'timezone', 'onlineUrl',
    'academicSession', 'logoUrl', 'audience', 'registration', 'details'
];

const FORMAT_KEYS = EVENT_FORMATS.map((row) => row.key);
const VISIBILITY_KEYS = VISIBILITIES.map((row) => row.key);
const MODE_KEYS = REGISTRATION_MODES.map((row) => row.key);
const VENUE_KEYS = ['name', 'address', 'city', 'state', 'country'];

const has = (source, key) => source[key] !== undefined;
const str = (value, max = LIMITS.text) => String(value ?? '').trim().slice(0, max);
const plain = (value) => (value && typeof value.toObject === 'function' ? value.toObject() : value) || {};

/** http(s) only — rejects javascript:, data: and relative URLs. */
export function isHttpUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

function isTimeZone(value) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

function toDate(value) {
    if (value === null || value === '' || value === undefined) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function sanitizeRows(raw, path, errors, [primary, secondary], secondaryMax) {
    if (!Array.isArray(raw)) { errors[path] = 'Must be a list'; return undefined; }
    const rows = [];
    for (const row of raw) {
        const main = str(row?.[primary]);
        const extra = str(row?.[secondary], secondaryMax);
        if (!main && !extra) continue;
        if (!main) { errors[path] = `Every row needs a ${primary}`; return undefined; }
        rows.push({ [primary]: main, [secondary]: extra });
    }
    if (rows.length > LIMITS.rows) { errors[path] = `At most ${LIMITS.rows} rows`; return undefined; }
    return rows.length ? rows : undefined;
}

function sanitizeDetailValue(field, raw, path, errors) {
    if (raw === undefined || raw === null || raw === '') return undefined;
    switch (field.type) {
        case 'text': return str(raw, field.maxLength || LIMITS.text) || undefined;
        case 'textarea': return str(raw, LIMITS.textarea) || undefined;
        case 'boolean': return Boolean(raw);
        case 'number': {
            const value = Number(raw);
            if (!Number.isFinite(value) || value < 0) { errors[path] = 'Must be zero or more'; return undefined; }
            return Math.floor(value);
        }
        case 'select': {
            if (!field.options.some((option) => option.key === raw)) { errors[path] = 'Pick one of the listed options'; return undefined; }
            return raw;
        }
        case 'list': {
            if (!Array.isArray(raw)) { errors[path] = 'Must be a list'; return undefined; }
            const items = [...new Set(raw.map((item) => str(item, LIMITS.listItem)).filter(Boolean))];
            if (items.length > LIMITS.listItems) { errors[path] = `At most ${LIMITS.listItems} items`; return undefined; }
            return items.length ? items : undefined;
        }
        case 'schedule': return sanitizeRows(raw, path, errors, ['title', 'time'], LIMITS.scheduleTime);
        case 'people': return sanitizeRows(raw, path, errors, ['name', 'role'], LIMITS.text);
        default: return undefined;
    }
}

/** Keep only the tracks relevant to this organizer + category, and only known fields within them. */
export function sanitizeDetails(raw, tracks, errors) {
    const source = plain(raw);
    const out = {};
    for (const track of tracks) {
        const input = plain(source[track]);
        const clean = {};
        for (const field of DETAIL_TRACKS[track].fields) {
            const value = sanitizeDetailValue(field, input[field.key], `details.${track}.${field.key}`, errors);
            if (value !== undefined) clean[field.key] = value;
        }
        if (Object.keys(clean).length) out[track] = clean;
    }
    return out;
}

/**
 * Validate the organizer/category/format/audience/registration/details fields of an event write.
 * Only fields present in `data` are returned in `updates` (so partial edits keep the rest), but
 * cross-field rules are checked against the merged result. `targetStatus` enables the extra
 * checks that only apply when submitting for review or publishing.
 */
export function sanitizeEventProfile(data = {}, existing = null, { targetStatus } = {}) {
    const errors = {};
    const updates = {};
    const before = plain(existing);

    if (has(data, 'organizerType')) {
        if (!findOrganizerType(data.organizerType)) errors.organizerType = 'Choose an organizer type';
        else updates.organizerType = data.organizerType;
    }
    if (has(data, 'organizationName')) updates.organizationName = str(data.organizationName, 140);
    if (has(data, 'eventFormat')) {
        if (!FORMAT_KEYS.includes(data.eventFormat)) errors.eventFormat = 'Choose in-person, online or hybrid';
        else updates.eventFormat = data.eventFormat;
    }
    if (has(data, 'visibility')) {
        if (!VISIBILITY_KEYS.includes(data.visibility)) errors.visibility = 'Choose public or private';
        else updates.visibility = data.visibility;
    }
    if (has(data, 'timezone')) {
        const zone = str(data.timezone, 64) || 'Asia/Kolkata';
        if (!isTimeZone(zone)) errors.timezone = 'Unknown time zone';
        else updates.timezone = zone;
    }
    if (has(data, 'academicSession')) updates.academicSession = str(data.academicSession, 40);
    for (const key of ['onlineUrl', 'logoUrl', 'imageUrl']) {
        if (!has(data, key)) continue;
        const value = str(data[key], 2048);
        if (value && !isHttpUrl(value)) errors[key] = 'Must be a full http(s) URL';
        else updates[key] = value;
    }
    if (has(data, 'venue')) {
        const venue = plain(data.venue);
        updates.venue = { ...plain(before.venue) };
        for (const key of VENUE_KEYS) if (has(venue, key)) updates.venue[key] = str(venue[key]);
        for (const key of ['latitude', 'longitude']) {
            if (has(venue, key)) updates.venue[key] = Number.isFinite(Number(venue[key])) ? Number(venue[key]) : undefined;
        }
    }

    // Category / subcategory: subcategory must belong to a known category's list.
    const category = has(data, 'category') ? str(data.category, 80) : before.category;
    if (has(data, 'category')) {
        if (!category) errors.category = 'Choose a category';
        else updates.category = category;
    }
    const known = findCategory(category);
    if (has(data, 'subcategory')) {
        const sub = str(data.subcategory, 80);
        if (sub && known && !known.subcategories.includes(sub)) errors.subcategory = `Not a ${known.key} subcategory`;
        else updates.subcategory = sub;
    } else if (has(data, 'category') && before.subcategory && known && !known.subcategories.includes(before.subcategory)) {
        updates.subcategory = '';
    }

    // Dates.
    const startsAt = has(data, 'startsAt') ? toDate(data.startsAt) : toDate(before.startsAt);
    const endsAt = has(data, 'endsAt') ? toDate(data.endsAt) : toDate(before.endsAt);
    if (has(data, 'startsAt') && !startsAt) errors.startsAt = 'Start time is invalid';
    if (has(data, 'endsAt') && endsAt === undefined) errors.endsAt = 'End time is invalid';
    if (startsAt && endsAt && endsAt < startsAt) errors.endsAt = 'End must be after start';

    if (has(data, 'audience')) {
        const audience = plain(data.audience);
        const count = (key) => {
            if (audience[key] === undefined || audience[key] === null || audience[key] === '') return null;
            const value = Number(audience[key]);
            if (!Number.isInteger(value) || value < 0) { errors[`audience.${key}`] = 'Must be a whole number, zero or more'; return null; }
            return value;
        };
        updates.audience = {
            targetAudience: str(audience.targetAudience),
            minCapacity: count('minCapacity'),
            maxCapacity: count('maxCapacity')
        };
        const { minCapacity, maxCapacity } = updates.audience;
        if (minCapacity !== null && maxCapacity !== null && minCapacity > maxCapacity) {
            errors['audience.minCapacity'] = 'Minimum cannot exceed maximum';
        }
    }

    if (has(data, 'registration')) {
        const registration = plain(data.registration);
        const mode = registration.mode || plain(before.registration).mode || 'paid';
        if (!MODE_KEYS.includes(mode)) errors['registration.mode'] = 'Choose paid tickets or free registration';
        const opensAt = toDate(registration.opensAt);
        const closesAt = toDate(registration.closesAt);
        if (opensAt === undefined) errors['registration.opensAt'] = 'Invalid date';
        if (closesAt === undefined) errors['registration.closesAt'] = 'Invalid date';
        if (opensAt && closesAt && closesAt <= opensAt) errors['registration.closesAt'] = 'Registration must close after it opens';
        const eventEnd = endsAt || startsAt;
        if (closesAt && eventEnd && closesAt > eventEnd) errors['registration.closesAt'] = 'Registration must close before the event ends';
        updates.registration = { mode, opensAt: opensAt || null, closesAt: closesAt || null };
    }

    // Details are scoped to the organizer + category tracks; switching either prunes stale tracks.
    const organizerType = updates.organizerType || before.organizerType || 'other';
    const tracks = tracksFor(organizerType, category);
    if (has(data, 'details')) {
        updates.details = sanitizeDetails(data.details, tracks, errors);
    } else if (existing && (updates.organizerType || updates.category)) {
        updates.details = sanitizeDetails(before.details, tracks, {});
    }

    if (targetStatus && targetStatus !== 'draft' && targetStatus !== 'cancelled') {
        const format = updates.eventFormat || before.eventFormat || 'in_person';
        const onlineUrl = has(updates, 'onlineUrl') ? updates.onlineUrl : before.onlineUrl;
        if (format !== 'in_person' && !onlineUrl && !errors.onlineUrl) errors.onlineUrl = 'Online and hybrid events need a meeting link';
        const orgName = has(updates, 'organizationName') ? updates.organizationName : before.organizationName;
        if (findOrganizerType(organizerType)?.orgRequired && !orgName) errors.organizationName = 'Organization name is required';
    }

    return { updates, errors };
}

/** Category-specific details safe for the public event page (private fields and empty values removed). */
export function publicDetails(event) {
    const details = plain(event?.details);
    const sections = [];
    for (const track of tracksFor(event?.organizerType || 'other', event?.category)) {
        const values = plain(details[track]);
        const items = [];
        for (const field of DETAIL_TRACKS[track].fields) {
            if (field.private) continue;
            const value = values[field.key];
            if (value === undefined || value === null || value === '' || value === false) continue;
            if (Array.isArray(value) && !value.length) continue;
            const display = field.type === 'select'
                ? field.options.find((option) => option.key === value)?.label || value
                : value;
            items.push({ key: field.key, label: field.label, type: field.type, value: display });
        }
        if (items.length) sections.push({ track, label: DETAIL_TRACKS[track].label, items });
    }
    return sections;
}

/** URL slug for a new event: kebab-case title plus a short random suffix. */
export const makeSlug = (title) =>
    `${String(title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${crypto.randomBytes(3).toString('hex')}`;

export const firstError = (errors) => Object.values(errors)[0];
