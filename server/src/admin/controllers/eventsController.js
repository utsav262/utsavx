import { z } from 'zod';
import mongoose from 'mongoose';
import Event from '../../models/Event.js';
import EventCategory from '../../models/EventCategory.js';
import EventCity from '../../models/EventCity.js';
import EventGuest from '../../models/EventGuest.js';
import EventImage from '../../models/EventImage.js';
import EventHandler from '../../models/EventHandler.js';
import BookingOrder from '../../models/BookingOrder.js';
import { invalidateEventCaches, invalidateCatalogCache } from '../../services/cacheService.js';
import { notifyUser } from '../../services/notificationService.js';
import { audit } from '../middleware/audit.js';
import { containsRegex, fail, listQuery, parseBody, sendList } from '../services/listing.js';

const STATUSES = ['draft', 'published', 'sold-out', 'cancelled', 'review_pending'];

export const eventsQuery = listQuery({
    status: z.enum(['all', ...STATUSES]).default('all'),
    featured: z.enum(['all', 'yes', 'no']).default('all')
});

const serialize = (e) => ({
    _id: e._id, title: e.title, slug: e.slug, status: e.status, featured: Boolean(e.featured),
    category: e.category, city: e.venue?.city, starts_at: e.startsAt, ends_at: e.endsAt,
    organizer: e.organizer && typeof e.organizer === 'object' ? { _id: e.organizer._id, name: e.organizer.name, email: e.organizer.email } : e.organizer,
    capacity: (e.ticketTypes || []).reduce((s, t) => s + Number(t.quantity || 0), 0),
    sold: (e.ticketTypes || []).reduce((s, t) => s + Number(t.sold || 0), 0),
    review_note: e.reviewNote || null, created_at: e.createdAt
});

export async function list(req, res) {
    const { q, status, featured } = req.validatedQuery;
    const filter = {};
    if (q) filter.$or = [{ title: containsRegex(q) }, { 'venue.city': containsRegex(q) }, { category: containsRegex(q) }];
    if (status !== 'all') filter.status = status;
    if (featured !== 'all') filter.featured = featured === 'yes' ? true : { $ne: true };
    const pending = await Event.countDocuments({ status: 'review_pending' });
    return sendList(req, res, {
        model: Event, filter, sort: { status: 1, startsAt: -1 }, populate: [{ path: 'organizer', select: 'name email' }],
        serialize, filename: 'events', extra: { counts: { review_pending: pending } },
        columns: [
            { label: 'Title', value: 'title' }, { label: 'Status', value: 'status' }, { label: 'Featured', value: (r) => (r.featured ? 'yes' : 'no') },
            { label: 'Category', value: 'category' }, { label: 'City', value: 'city' }, { label: 'Starts', value: 'starts_at' },
            { label: 'Organizer', value: (r) => r.organizer?.email }, { label: 'Sold', value: 'sold' }, { label: 'Capacity', value: 'capacity' }
        ]
    });
}

export async function detail(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Event not found');
    const event = await Event.findById(req.params.id).populate('organizer', 'name email').lean();
    if (!event) return fail(res, 404, 'Event not found');
    const [guests, images, team, sales] = await Promise.all([
        EventGuest.find({ event: event._id }).lean(),
        EventImage.find({ event: event._id }).sort({ sortOrder: 1 }).lean(),
        EventHandler.find({ event: event._id }).select('email firstName lastName userType invitationStatus').lean(),
        BookingOrder.aggregate([{ $match: { event: event._id, status: 'paid' } }, { $group: { _id: null, gross: { $sum: '$total' }, orders: { $sum: 1 } } }])
    ]);
    return res.json({
        message: 'OK', code: 200,
        result: {
            ...serialize(event),
            description: event.description,
            venue: event.venue,
            page_views: event.pageViews || 0,
            tickets: (event.ticketTypes || []).map((t) => ({ _id: t._id, name: t.name, price: t.price, quantity: t.quantity, sold: t.sold || 0 })),
            guests: guests.map((g) => ({ _id: g._id, name: g.name, email: g.email, status: g.status })),
            images: images.map((i) => ({ _id: i._id, url: i.url, type: i.type })),
            team: team.map((h) => ({ email: h.email, name: [h.firstName, h.lastName].filter(Boolean).join(' '), role: h.userType, status: h.invitationStatus })),
            sales: { gross: sales[0]?.gross || 0, orders: sales[0]?.orders || 0 }
        }
    });
}

/** Allowed moderation transitions. */
const ACTIONS = {
    approve: { from: ['review_pending'], to: 'published', title: 'Event approved', message: (e) => `${e.title} is live.` },
    reject: { from: ['review_pending'], to: 'draft', needsNote: true, title: 'Event needs changes', message: (e, n) => `${e.title} was sent back: ${n}` },
    unpublish: { from: ['published', 'sold-out'], to: 'draft', needsNote: true, title: 'Event unpublished', message: (e, n) => `${e.title} was unpublished: ${n}` },
    cancel: { from: ['draft', 'published', 'sold-out', 'review_pending'], to: 'cancelled', needsNote: true, title: 'Event cancelled', message: (e, n) => `${e.title} was cancelled by the platform: ${n}` },
    republish: { from: ['draft', 'cancelled'], to: 'published', title: 'Event published', message: (e) => `${e.title} was published by the platform.` }
};

const moderateSchema = z.object({ action: z.enum(Object.keys(ACTIONS)), note: z.string().trim().max(500).optional() });

export async function moderate(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Event not found');
    const data = parseBody(moderateSchema, req, res);
    if (!data) return undefined;
    const rule = ACTIONS[data.action];
    if (rule.needsNote && !data.note) return fail(res, 422, 'Add a note for the organizer');

    const before = await Event.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Event not found');
    if (!rule.from.includes(before.status)) return fail(res, 409, `Can't ${data.action} an event that is ${before.status}`);
    const after = await Event.findOneAndUpdate(
        { _id: before._id, status: before.status },
        { $set: { status: rule.to, reviewNote: data.note || null } },
        { new: true }
    ).lean();
    if (!after) return fail(res, 409, 'The event changed while you were reviewing it. Reload and try again.');

    await invalidateEventCaches(after);
    await audit(req, { action: `event.${data.action}`, targetType: 'Event', targetId: after._id, before: { status: before.status }, after: { status: after.status, note: data.note } });
    await notifyUser({ userId: after.organizer, type: `EVENT_${data.action.toUpperCase()}`, title: rule.title, message: rule.message(after, data.note), payload: { eventId: after._id } });
    const done = { approve: 'approved', reject: 'sent back', unpublish: 'unpublished', cancel: 'cancelled', republish: 'published' };
    return res.json({ message: `Event ${done[data.action]}`, code: 200, result: serialize(after) });
}

export async function feature(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Event not found');
    const data = parseBody(z.object({ featured: z.boolean() }), req, res);
    if (!data) return undefined;
    const before = await Event.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Event not found');
    const after = await Event.findByIdAndUpdate(before._id, { $set: { featured: data.featured } }, { new: true }).lean();
    await invalidateEventCaches(after);
    await audit(req, { action: data.featured ? 'event.feature' : 'event.unfeature', targetType: 'Event', targetId: after._id, before: { featured: Boolean(before.featured) }, after: { featured: after.featured } });
    return res.json({ message: data.featured ? 'Event featured' : 'Event unfeatured', code: 200, result: serialize(after) });
}

/* ---------------- categories & cities ---------------- */

const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const categorySchema = z.object({ name: z.string().trim().min(1).max(60), status: z.union([z.literal(0), z.literal(1)]).default(1) });
const citySchema = z.object({ name: z.string().trim().min(1).max(80), country: z.string().trim().min(1).max(80).default('India'), status: z.union([z.literal(0), z.literal(1)]).default(1) });

export async function categories(req, res) {
    const rows = await EventCategory.find().sort({ name: 1 }).lean();
    const usage = await Event.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
    const used = new Map(usage.map((u) => [u._id, u.n]));
    return res.json({ message: 'OK', code: 200, result: rows.map((c) => ({ _id: c._id, name: c.name, slug: c.slug, active: c.status === 1, events: used.get(c.name) || 0 })) });
}

async function saveCatalog(req, res, { Model, schema, kind, build }) {
    const data = parseBody(schema, req, res);
    if (!data) return undefined;
    const id = req.params.id;
    if (id && !mongoose.isValidObjectId(id)) return fail(res, 404, `${kind} not found`);
    const before = id ? await Model.findById(id).lean() : null;
    if (id && !before) return fail(res, 404, `${kind} not found`);
    try {
        const doc = id
            ? await Model.findByIdAndUpdate(id, { $set: build(data) }, { new: true, runValidators: true }).lean()
            : (await Model.create(build(data))).toObject();
        await invalidateCatalogCache();
        await audit(req, { action: `${kind.toLowerCase()}.${id ? 'update' : 'create'}`, targetType: kind, targetId: doc._id, before, after: doc });
        return res.status(id ? 200 : 201).json({ message: `${kind} saved`, code: 200, result: doc });
    } catch (error) {
        if (error.code === 11000) return fail(res, 409, `That ${kind.toLowerCase()} already exists`);
        throw error;
    }
}

export const saveCategory = (req, res) => saveCatalog(req, res, {
    Model: EventCategory, schema: categorySchema, kind: 'Category', build: (d) => ({ name: d.name, slug: slugify(d.name), status: d.status })
});

export async function cities(req, res) {
    const rows = await EventCity.find().sort({ country: 1, name: 1 }).lean();
    return res.json({ message: 'OK', code: 200, result: rows.map((c) => ({ _id: c._id, name: c.name, country: c.country, active: c.status === 1 })) });
}

export const saveCity = (req, res) => saveCatalog(req, res, {
    Model: EventCity, schema: citySchema, kind: 'City', build: (d) => ({ name: d.name, country: d.country, status: d.status })
});
