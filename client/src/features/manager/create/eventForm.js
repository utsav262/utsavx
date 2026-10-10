import { isNonComplimentary } from '../../tickets/ticketUtils.js';

/* ---------- time zones ---------- */

export const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

const pad = (n) => String(n).padStart(2, '0');

/** Wall-clock parts of a UTC instant in `timeZone`. */
function zonedParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour') % 24, mi: get('minute'), s: get('second') };
}

function offsetMs(ms, timeZone) {
  const p = zonedParts(ms, timeZone);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

function parseLocal(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || '');
  return m ? m.slice(1).map(Number) : null;
}

/** "2026-10-10T18:00" entered in `timeZone` → ISO instant. Returns null when empty/invalid. */
export function zonedLocalToIso(local, timeZone) {
  const p = parseLocal(local);
  if (!p) return null;
  const [y, mo, d, h, mi] = p;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  try {
    let guess = wall - offsetMs(wall, timeZone);
    guess = wall - offsetMs(guess, timeZone); // second pass settles DST edges
    return new Date(guess).toISOString();
  } catch {
    return new Date(wall).toISOString();
  }
}

/** ISO instant → "YYYY-MM-DDTHH:mm" wall clock in `timeZone` (for datetime-local inputs). */
export function isoToZonedLocal(value, timeZone) {
  if (!value) return '';
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return '';
  try {
    const p = zonedParts(ms, timeZone);
    return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
  } catch {
    return '';
  }
}

/** Human label for a datetime-local value, exactly as entered (no zone shifting). */
export function formatLocalInput(local) {
  const p = parseLocal(local);
  if (!p) return null;
  const [y, mo, d, h, mi] = p;
  return new Date(Date.UTC(y, mo - 1, d, h, mi)).toLocaleString('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ---------- taxonomy helpers ---------- */

export const findOrganizer = (taxonomy, key) =>
  taxonomy?.organizerTypes.find((row) => row.key === key) || null;

export const findCategory = (taxonomy, key) =>
  taxonomy?.categories.find((row) => row.key.toLowerCase() === String(key || '').toLowerCase()) || null;

/** Same rule as the server: organizer tracks (e.g. school → education) plus the category's track. */
export function tracksFor(taxonomy, organizerType, category) {
  if (!taxonomy) return [];
  const tracks = [...(findOrganizer(taxonomy, organizerType)?.tracks || [])];
  const categoryTrack = findCategory(taxonomy, category)?.track;
  if (categoryTrack && !tracks.includes(categoryTrack)) tracks.push(categoryTrack);
  return tracks.filter((key) => taxonomy.detailTracks[key]);
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/* ---------- form state ---------- */

export function emptyForm() {
  return {
    organizerType: '',
    organizationName: '',
    category: '',
    subcategory: '',
    eventFormat: 'in_person',
    visibility: 'public',
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    timezone: browserTimeZone(),
    venue: { name: '', address: '', city: '', state: '', country: 'India' },
    onlineUrl: '',
    academicSession: '',
    featured: false,
    imageUrl: '',
    logoUrl: '',
    audience: { targetAudience: '', minCapacity: '', maxCapacity: '' },
    registration: { mode: 'paid', opensAt: '', closesAt: '' },
    details: {},
  };
}

const numText = (value) => (value === null || value === undefined ? '' : String(value));

/** Saved event (manager API) → wizard form. Missing fields fall back to the same defaults as the server. */
export function formFromEvent(event) {
  const timezone = event.timezone || 'Asia/Kolkata';
  return {
    ...emptyForm(),
    organizerType: event.organizerType || 'other',
    organizationName: event.organizationName || '',
    category: event.category || '',
    subcategory: event.subcategory || '',
    eventFormat: event.eventFormat || 'in_person',
    visibility: event.visibility || 'public',
    title: event.title || '',
    description: event.description || '',
    startsAt: isoToZonedLocal(event.startsAt, timezone),
    endsAt: isoToZonedLocal(event.endsAt, timezone),
    timezone,
    venue: {
      name: event.venue?.name || '',
      address: event.venue?.address || '',
      city: event.venue?.city || '',
      state: event.venue?.state || '',
      country: event.venue?.country || 'India',
    },
    onlineUrl: event.onlineUrl || '',
    academicSession: event.academicSession || '',
    featured: Boolean(event.featured),
    imageUrl: event.imageUrl || '',
    logoUrl: event.logoUrl || '',
    audience: {
      targetAudience: event.audience?.targetAudience || '',
      minCapacity: numText(event.audience?.minCapacity),
      maxCapacity: numText(event.audience?.maxCapacity),
    },
    registration: {
      mode: event.registration?.mode || 'paid',
      opensAt: isoToZonedLocal(event.registration?.opensAt, timezone),
      closesAt: isoToZonedLocal(event.registration?.closesAt, timezone),
    },
    details: event.details || {},
  };
}

/** Only the active tracks, with empty values removed and numbers parsed. */
export function pruneDetails(taxonomy, details, tracks) {
  const out = {};
  for (const track of tracks) {
    const values = details?.[track] || {};
    const clean = {};
    for (const field of taxonomy.detailTracks[track].fields) {
      const value = values[field.key];
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value) && !value.length) continue;
      clean[field.key] = field.type === 'number' ? Number(value) : value;
    }
    if (Object.keys(clean).length) out[track] = clean;
  }
  return out;
}

const countOrNull = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

/** Form → body for POST /manager/events/create-or-update. */
export function buildEventPayload({ form, taxonomy, status, isAdmin }) {
  const tracks = tracksFor(taxonomy, form.organizerType, form.category);
  const organizer = findOrganizer(taxonomy, form.organizerType);
  const tz = form.timezone;
  const city = form.venue.city.trim();
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    organizerType: form.organizerType,
    organizationName: organizer?.orgLabel ? form.organizationName.trim() : '',
    category: form.category,
    subcategory: form.subcategory,
    eventFormat: form.eventFormat,
    visibility: form.visibility,
    timezone: tz,
    startsAt: zonedLocalToIso(form.startsAt, tz),
    endsAt: zonedLocalToIso(form.endsAt, tz),
    venue: {
      name: form.venue.name.trim() || city,
      address: form.venue.address.trim(),
      city,
      state: form.venue.state.trim(),
      country: form.venue.country.trim() || 'India',
    },
    onlineUrl: form.eventFormat === 'in_person' ? '' : form.onlineUrl.trim(),
    academicSession: tracks.includes('education') ? form.academicSession.trim() : '',
    imageUrl: form.imageUrl.trim(),
    logoUrl: form.logoUrl.trim(),
    audience: {
      targetAudience: form.audience.targetAudience.trim(),
      minCapacity: countOrNull(form.audience.minCapacity),
      maxCapacity: countOrNull(form.audience.maxCapacity),
    },
    registration: {
      mode: form.registration.mode,
      opensAt: zonedLocalToIso(form.registration.opensAt, tz),
      closesAt: zonedLocalToIso(form.registration.closesAt, tz),
    },
    details: pruneDetails(taxonomy, form.details, tracks),
    status,
  };
  if (isAdmin) payload.featured = Boolean(form.featured);
  return payload;
}

/* ---------- steps & validation ---------- */

const BASE_STEPS = [
  { id: 'organizer', label: 'Organizer', hint: 'Who & what kind' },
  { id: 'basics', label: 'Basics', hint: 'Name, when, where' },
  { id: 'media', label: 'Look', hint: 'Cover, gallery, logo' },
  { id: 'audience', label: 'Audience', hint: 'Capacity & registration' },
  { id: 'tickets', label: 'Tickets', hint: 'Pricing & offers' },
  { id: 'people', label: 'Team', hint: 'Roles & guests' },
  { id: 'details', label: 'Details', hint: 'Event specifics' },
  { id: 'review', label: 'Review', hint: 'Submit or save' },
];

/** The Details step only appears when the organizer/category has specialized fields. */
export function buildSteps(tracks) {
  return BASE_STEPS.filter((step) => step.id !== 'details' || tracks.length > 0);
}

const isWholeCount = (value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0);

/**
 * Errors for one step, keyed by field. ctx: { form, taxonomy, tickets, isNew, final, draft }.
 * `final` adds the checks needed to submit/publish; `draft` relaxes to what the server needs to store a draft.
 */
export function validateStep(id, ctx) {
  const { form, taxonomy, tickets = [], isNew, final, draft } = ctx;
  const e = {};
  const startIso = zonedLocalToIso(form.startsAt, form.timezone);
  const endIso = zonedLocalToIso(form.endsAt, form.timezone);

  if (id === 'organizer') {
    if (!form.organizerType) e.organizerType = 'Choose who is organizing';
    if (!form.category) e.category = 'Choose a category';
    const organizer = findOrganizer(taxonomy, form.organizerType);
    if (!draft && organizer?.orgRequired && !form.organizationName.trim()) {
      e.organizationName = `${organizer.orgLabel} is required`;
    }
  }

  if (id === 'basics') {
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.startsAt) e.startsAt = 'Start time is required';
    else if (isNew && !draft && new Date(startIso) < new Date()) e.startsAt = 'Start time is in the past';
    if (form.endsAt && startIso && endIso && new Date(endIso) < new Date(startIso)) e.endsAt = 'End must be after start';
    if (!draft && form.eventFormat !== 'online' && !form.venue.city.trim()) e.city = 'City is required for in-person events';
    if (form.eventFormat !== 'in_person') {
      if (form.onlineUrl.trim() && !isHttpUrl(form.onlineUrl.trim())) e.onlineUrl = 'Use a full link starting with https://';
      else if (final && !form.onlineUrl.trim()) e.onlineUrl = 'Online and hybrid events need a meeting link';
    }
  }

  if (id === 'media') {
    if (form.imageUrl.trim() && !isHttpUrl(form.imageUrl.trim())) e.imageUrl = 'Use a full image URL starting with https://';
    if (form.logoUrl.trim() && !isHttpUrl(form.logoUrl.trim())) e.logoUrl = 'Use a full image URL starting with https://';
  }

  if (id === 'audience') {
    const { minCapacity, maxCapacity } = form.audience;
    if (!isWholeCount(minCapacity)) e.minCapacity = 'Whole number, zero or more';
    if (!isWholeCount(maxCapacity)) e.maxCapacity = 'Whole number, zero or more';
    if (!e.minCapacity && !e.maxCapacity && minCapacity !== '' && maxCapacity !== '' && Number(minCapacity) > Number(maxCapacity)) {
      e.minCapacity = 'Minimum cannot exceed maximum';
    }
    const opens = zonedLocalToIso(form.registration.opensAt, form.timezone);
    const closes = zonedLocalToIso(form.registration.closesAt, form.timezone);
    if (opens && closes && new Date(closes) <= new Date(opens)) e.closesAt = 'Registration must close after it opens';
    const eventEnd = endIso || startIso;
    if (closes && eventEnd && new Date(closes) > new Date(eventEnd)) e.closesAt = 'Registration must close before the event ends';
  }

  if (id === 'tickets' && !draft) {
    const sellable = tickets.filter(isNonComplimentary);
    const paid = sellable.filter((t) => t.ticketType !== 'free' && Number(t.price) > 0);
    if (form.registration.mode === 'paid' && !paid.length) e.tickets = 'Add at least 1 paid ticket';
    if (form.registration.mode === 'free' && !sellable.length) e.tickets = 'Add at least 1 ticket (free is fine)';
    // Capacity is in people: a group ticket (admits 3) uses three places.
    const max = form.audience.maxCapacity;
    if (!e.tickets && max !== '' && sellable.length) {
      const unlimited = sellable.some((t) => !(Math.floor(Number(t.quantity)) > 0));
      const total = sellable.reduce((sum, t) => sum + Math.floor(Number(t.quantity) || 0) * Math.max(1, Math.floor(Number(t.admits)) || 1), 0);
      if (unlimited || total > Number(max)) {
        e.tickets = `Tickets admit ${unlimited ? 'unlimited' : total} people, over the maximum of ${max} participants`;
      }
    }
  }

  return e;
}

/** Every problem across the wizard, in step order — drives the review checklist and submit gating. */
export function validateAll(steps, ctx) {
  const issues = [];
  steps.forEach((step, index) => {
    for (const [field, message] of Object.entries(validateStep(step.id, ctx))) {
      issues.push({ stepIndex: index, stepId: step.id, stepLabel: step.label, field, message });
    }
  });
  return issues;
}
