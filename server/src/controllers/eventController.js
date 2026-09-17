import mongoose from 'mongoose';
import Event from '../models/Event.js';
import EventImage from '../models/EventImage.js';
import EventGuest from '../models/EventGuest.js';
import EventHandler from '../models/EventHandler.js';
import EventCategory from '../models/EventCategory.js';
import EventCity from '../models/EventCity.js';
import GlobalSetting from '../models/GlobalSetting.js';
import BookingOrder from '../models/BookingOrder.js';
import Ticket from '../models/Ticket.js';
import { success } from '../utils/response.js';

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMongoId(id) {
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

function idFilter(id) {
    return isMongoId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };
}

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function endOfDay(value) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
}

function weekendBounds(weeksAhead = 0) {
    const now = new Date();
    const day = now.getDay();
    const toSaturday = ((6 - day) + 7) % 7;
    const saturday = new Date(now);
    saturday.setDate(now.getDate() + toSaturday + weeksAhead * 7);
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    return { from: saturday, to: sunday };
}

function monthBounds() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
}

function decodeCountryTimezones(raw) {
    if (Array.isArray(raw)) return raw;
    const text = String(raw || '').trim();
    if (!text) return [];
    try {
        const decoded = JSON.parse(text);
        return Array.isArray(decoded) ? decoded : [];
    } catch {
        const repaired = text.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3');
        try {
            const decoded = JSON.parse(repaired);
            return Array.isArray(decoded) ? decoded : [];
        } catch {
            return [];
        }
    }
}

function publicTicketTypes(ticketTypes = []) {
    return ticketTypes.filter((ticket) => {
        const type = String(ticket.type || ticket.name || '').toLowerCase();
        return type !== 'apsession_complimentary' && type !== 'complimentary';
    }).map((ticket) => ({
        id: ticket._id,
        _id: ticket._id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
        sold: ticket.sold || 0,
        quantity_left: Math.max(0, (ticket.quantity || 0) - (ticket.sold || 0)),
        currency: ticket.currency || 'INR',
        salesStatus: ticket.salesStatus,
        type: ticket.type || null
    }));
}

function toListItem(event, coverUrl = null) {
    const cover = coverUrl || event.imageUrl || null;
    const city = event.venue?.city || null;
    const country = event.venue?.country || null;
    return {
        id: event._id,
        _id: event._id,
        title: event.title,
        name: event.title,
        slug: event.slug,
        event_link: event.slug,
        description: event.description,
        category: event.category,
        genre: event.category,
        city,
        country,
        venue: event.venue || {},
        startsAt: event.startsAt,
        endsAt: event.endsAt || event.startsAt,
        date: event.startsAt ? new Date(event.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null,
        end_date: event.endsAt || event.startsAt,
        imageUrl: cover,
        image: cover,
        cover_image: cover,
        horizontal_flyer: cover,
        status: event.status,
        post_visibility: event.status,
        featured: Boolean(event.featured),
        price: event.ticketTypes?.[0]?.price ?? 0,
        ticketTypes: publicTicketTypes(event.ticketTypes)
    };
}

async function coversByEventIds(eventIds) {
    const images = await EventImage.find({ event: { $in: eventIds }, type: 'cover' }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    const map = new Map();
    for (const image of images) {
        const key = String(image.event);
        if (!map.has(key)) map.set(key, image.url);
    }
    return map;
}

function buildPublishedFilter(query = {}) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    const filter = {
        status: { $in: ['published', 'sold-out'] },
        $or: [
            { endsAt: { $gt: cutoff } },
            { endsAt: null, startsAt: { $gt: cutoff } }
        ]
    };

    const country = String(query.country || '').trim();
    const city = String(query.city || '').trim();
    const category = String(query.category || query.genre || '').trim();
    const search = String(query.search || query.q || '').trim();
    const eventType = String(query.eventType || '').trim();

    if (country) filter['venue.country'] = new RegExp(`^${escapeRegex(country)}$`, 'i');
    if (city) filter['venue.city'] = new RegExp(`^${escapeRegex(city)}$`, 'i');
    if (category && !['all', 'All events', 'All'].includes(category)) {
        filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    }
    if (query.featured === 'true' || query.featured === true) filter.featured = true;

    if (query.date) {
        filter.startsAt = { $gte: startOfDay(query.date), $lte: endOfDay(query.date) };
    } else if (query.date_from || query.date_to) {
        filter.startsAt = {};
        if (query.date_from) filter.startsAt.$gte = startOfDay(query.date_from);
        if (query.date_to) filter.startsAt.$lte = endOfDay(query.date_to);
    }

    if (eventType && !['All', 'all', ''].includes(eventType)) {
        if (eventType === 'This Weekend') {
            const { from, to } = weekendBounds(0);
            filter.startsAt = { ...(filter.startsAt || {}), $gte: from, $lte: to };
        } else if (eventType === 'Next Weekend') {
            const { from, to } = weekendBounds(1);
            filter.startsAt = { ...(filter.startsAt || {}), $gte: from, $lte: to };
        } else if (eventType === 'This Month') {
            const { from, to } = monthBounds();
            filter.startsAt = { ...(filter.startsAt || {}), $gte: from, $lte: to };
        } else if (!category) {
            filter.category = new RegExp(`^${escapeRegex(eventType)}$`, 'i');
        }
    }

    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i');
        filter.$and = [
            {
                $or: [
                    { title: rx },
                    { description: rx },
                    { category: rx },
                    { 'venue.city': rx },
                    { 'venue.country': rx },
                    { 'venue.name': rx }
                ]
            }
        ];
    }

    return filter;
}

export async function listEvents(req, res) {
    const filter = buildPublishedFilter(req.query);
    const events = await Event.find(filter).sort({ startsAt: 1, _id: 1 }).limit(100).lean();
    const covers = await coversByEventIds(events.map((event) => event._id));
    const result = events.map((event) => toListItem(event, covers.get(String(event._id))));
    res.json({ events: result, result, message: 'Success', code: 200 });
}

export async function getEvent(req, res) {
    return legacyEventDetails({ ...req, params: { ...req.params, slug: req.params.id } }, res);
}

export async function createEvent(req, res) {
    const payload = { ...req.body, organizer: req.user._id };
    if (req.user.role !== 'admin' && (payload.status === 'published' || payload.status === 'sold-out')) {
        payload.status = 'review_pending';
    }
    const event = await Event.create(payload);
    res.status(201).json({
        event,
        result: event,
        code: 200,
        message: event.status === 'review_pending' ? 'Event submitted for admin approval' : 'Event created successfully'
    });
}

export async function updateEvent(req, res) {
    const filter = { _id: req.params.id, ...(req.user.role === 'admin' ? {} : { organizer: req.user._id }) };
    const existing = await Event.findOne(filter);
    if (!existing) return res.status(404).json({ message: 'Event not found', code: 404 });
    const payload = { ...req.body };
    if (req.user.role !== 'admin' && (payload.status === 'published' || payload.status === 'sold-out')) {
        const alreadyLive = existing.status === 'published' || existing.status === 'sold-out';
        payload.status = alreadyLive && payload.status === 'sold-out' ? 'sold-out' : alreadyLive ? existing.status : 'review_pending';
    }
    const event = await Event.findOneAndUpdate(filter, { $set: payload }, { new: true, runValidators: true });
    res.json({ event, result: event, code: 200, message: 'Event updated successfully' });
}

export async function legacyListEvents(req, res) {
    try {
        const length = Math.min(50, Math.max(1, Number(req.query.length || 6)));
        const page = Math.max(1, Math.min(10000, Number(req.query.page || 1)));
        if (req.query.date_from && req.query.date_to && new Date(req.query.date_to) < new Date(req.query.date_from)) {
            return res.status(422).json({ message: 'Invalid request', errors: { date_to: ['date_to must be after or equal to date_from'] }, code: 422 });
        }
        const filter = buildPublishedFilter(req.query);
        const [rows, total] = await Promise.all([
            Event.find(filter).sort({ startsAt: 1, _id: 1 }).skip((page - 1) * length).limit(length).lean(),
            Event.countDocuments(filter)
        ]);
        const covers = await coversByEventIds(rows.map((event) => event._id));
        const result = rows.map((event) => toListItem(event, covers.get(String(event._id))));
        return success(res, result, 'Success', 200, {
            pagination: {
                current_page: page,
                last_page: Math.max(1, Math.ceil(total / length)),
                has_next_page: page * length < total
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(422).json({ message: 'Invalid request', errors: error.errors || {}, code: 422 });
        }
        throw error;
    }
}

export async function legacyEventDetails(req, res) {
    const slug = req.params.slug || req.params.id;
    const event = await Event.findOne(idFilter(slug))
        .populate('organizer', 'name email avatarUrl role verifiedAt')
        .sort({ _id: -1 })
        .lean();

    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });

    const [images, guests, handlers] = await Promise.all([
        EventImage.find({ event: event._id }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
        EventGuest.find({ event: event._id }).sort({ createdAt: 1 }).lean(),
        EventHandler.find({ event: event._id, invitationStatus: 'A', userType: 'Outlet' }).lean()
    ]);
    let setting = await GlobalSetting.findOne({ type: 'country', country: event.venue?.country || 'India' }).lean();
    if (!setting) setting = await GlobalSetting.findOne({ type: 'country' }).lean();

    const covers = images.filter((image) => image.type === 'cover');
    const flyers = images.filter((image) => image.type === 'flyer');
    const cover = covers[0]?.url || event.imageUrl || null;
    const flyer1 = flyers[0]?.url || null;
    const flyer2 = flyers[1]?.url || null;
    const feeSetting = setting || {
        currency: 'INR',
        Online_Payment_Fee_percentage: 2.9,
        Online_Payment_Fee_dollar_amount: 0.3,
        Online_Service_Fee_percentage: 5,
        Online_Service_Fee_dollar_amount: 0
    };
    const currency = feeSetting.currency || 'INR';
    const tickets = publicTicketTypes(event.ticketTypes).map((ticket) => ({ ...ticket, currency }));

    await Event.updateOne({ _id: event._id }, { $inc: { pageViews: 1 } });

    const host = event.organizer ? {
        id: event.organizer._id,
        username: event.organizer.name,
        name: event.organizer.name,
        email: event.organizer.email,
        image: event.organizer.avatarUrl || null,
        bio: null,
        followers_count: 0,
        following: false
    } : null;

    const result = {
        ...toListItem(event, cover),
        cover_image: cover,
        flyer1,
        flyer2,
        horizontal_flyer: cover,
        images,
        guests,
        tickets,
        ticketTypes: tickets,
        host,
        organizer: host,
        outlets: handlers.map((handler) => ({
            id: handler._id,
            email: handler.email,
            type: handler.type,
            status: handler.status
        })),
        page_visits: (event.pageViews || 0) + 1,
        _fee_settings: {
            currency,
            Online_Payment_Fee_percentage: Number(feeSetting.Online_Payment_Fee_percentage || 0),
            Online_Payment_Fee_dollar_amount: Number(feeSetting.Online_Payment_Fee_dollar_amount || 0),
            Online_Service_Fee_percentage: Number(feeSetting.Online_Service_Fee_percentage || 0),
            Online_Service_Fee_dollar_amount: Number(feeSetting.Online_Service_Fee_dollar_amount || 0),
            buyer_ticket_fee_amount_percentage: Number(feeSetting.Online_Service_Fee_percentage || 0),
            buyer_ticket_fee_dollar_amount: Number(feeSetting.Online_Service_Fee_dollar_amount || 0)
        }
    };

    return res.json({ message: 'Event fetched successfully', result, event: result, code: 200 });
}

export async function getRelatedEvents(req, res) {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found', code: 404 });

    const today = startOfDay(new Date());
    const relatedFilter = {
        _id: { $ne: event._id },
        status: { $in: ['published', 'sold-out'] },
        category: event.category,
        $or: [{ endsAt: { $gte: today } }, { endsAt: null, startsAt: { $gte: today } }]
    };
    if (event.venue?.country) relatedFilter['venue.country'] = event.venue.country;

    const related = await Event.find(relatedFilter).sort({ startsAt: 1, _id: 1 }).limit(10).lean();

    const covers = await coversByEventIds(related.map((row) => row._id));
    const result = related.map((row) => toListItem(row, covers.get(String(row._id))));
    return res.json({ result, code: 200 });
}

export async function getCountryList(req, res) {
    const countryId = req.query.country_id || req.query.global_setting_id;
    const country = String(req.query.country || '').trim();
    let settings;
    if (countryId) {
        settings = await GlobalSetting.find({ country_id: Number(countryId), type: 'country' }).lean();
    } else if (country) {
        settings = await GlobalSetting.find({ country: new RegExp(`^${escapeRegex(country)}$`, 'i'), type: 'country' }).lean();
    } else {
        settings = await GlobalSetting.find({ type: 'country' }).lean();
    }

    const result = settings.map((item) => ({
        ...item,
        fee: `${item.Online_Service_Fee_percentage || 0} % + $ ${item.Online_Service_Fee_dollar_amount || 0}`,
        card_process_fees: `${item.Online_Payment_Fee_percentage || 0} % + $ ${item.Online_Payment_Fee_dollar_amount || 0}`,
        timezone: decodeCountryTimezones(item.timezone)
    }));

    return success(res, result, 'Success');
}

export async function cityEventCounts(req, res) {
    const country = String(req.query.country || '').trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);

    const match = {
        status: { $in: ['published', 'sold-out'] },
        'venue.city': { $nin: [null, ''] },
        $or: [{ endsAt: { $gt: cutoff } }, { endsAt: null, startsAt: { $gt: cutoff } }]
    };
    if (country) match['venue.country'] = new RegExp(`^${escapeRegex(country)}$`, 'i');

    const rows = await Event.aggregate([
        { $match: match },
        { $group: { _id: '$venue.city', count: { $sum: 1 }, sampleEvent: { $max: '$_id' } } },
        { $sort: { count: -1 } },
        { $limit: limit }
    ]);

    const eventIds = rows.map((row) => row.sampleEvent).filter(Boolean);
    const events = await Event.find({ _id: { $in: eventIds } }).select('_id imageUrl').lean();
    const covers = await coversByEventIds(eventIds);
    const imageByEvent = new Map(events.map((event) => [String(event._id), covers.get(String(event._id)) || event.imageUrl || null]));

    const result = rows.map((row) => ({
        city: row._id,
        count: row.count,
        image_url: imageByEvent.get(String(row.sampleEvent)) || null
    }));

    return success(res, result, 'Success');
}

export async function eventBooking(req, res) {
    return res.status(410).json({ message: 'Endpoint removed', code: 410 });
}

export async function getCities(req, res) {
    const country = req.params.country;
    const cities = await EventCity.find({ country: new RegExp(`^${escapeRegex(country)}$`, 'i'), status: 1 }).sort({ name: 1 }).lean();
    return success(res, cities, 'Cities fetched successfully');
}

export async function getCategories(req, res) {
    const categories = await EventCategory.find({ status: 1 }).select('name slug').sort({ name: 1 }).lean();
    if (categories.length) return success(res, categories, 'Categories fetched successfully');

    const distinct = await Event.distinct('category', { status: { $in: ['published', 'sold-out'] } });
    return success(res, distinct.filter(Boolean).map((name) => ({
        name,
        slug: String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|$)/g, '')
    })), 'Categories fetched successfully');
}

export async function listByEventType(req, res) {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated', code: 401 });

    const eventType = String(req.query.event_type || '').trim();
    const length = Math.min(50, Math.max(1, Number(req.query.length || 6)));
    const page = Math.max(1, Number(req.query.page || 1));
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const accepted = await EventHandler.find({ email: req.user.email, invitationStatus: 'A' }).select('event').lean();
    const handlerEventIds = accepted.map((row) => row.event);
    const filter = {};
    const and = [];

    if (req.user.role !== 'admin') {
        and.push({ $or: [{ organizer: req.user._id }, { _id: { $in: handlerEventIds } }] });
    }

    if (eventType === 'live') {
        filter.status = { $in: ['published', 'sold-out'] };
        and.push({ $or: [{ endsAt: { $gte: twoDaysAgo } }, { endsAt: null, startsAt: { $gte: twoDaysAgo } }] });
    } else if (eventType === 'draft') {
        filter.status = { $in: ['draft', 'review_pending'] };
    } else if (eventType === 'past') {
        filter.status = { $in: ['published', 'sold-out'] };
        and.push({ $or: [{ endsAt: { $lt: twoDaysAgo } }, { endsAt: null, startsAt: { $lt: twoDaysAgo } }] });
    }

    if (and.length) filter.$and = and;

    const [rows, total] = await Promise.all([
        Event.find(filter).sort({ startsAt: 1, _id: 1 }).skip((page - 1) * length).limit(length).lean(),
        Event.countDocuments(filter)
    ]);

    const eventIds = rows.map((event) => event._id);
    const [images, guests, orders, tickets, handlers] = await Promise.all([
        EventImage.find({ event: { $in: eventIds } }).sort({ sortOrder: 1 }).lean(),
        EventGuest.find({ event: { $in: eventIds } }).lean(),
        BookingOrder.find({ event: { $in: eventIds }, status: 'paid' }).lean(),
        Ticket.find({ event: { $in: eventIds }, status: 'valid' }).lean(),
        EventHandler.find({ event: { $in: eventIds }, email: req.user.email, invitationStatus: 'A' }).lean()
    ]);

    const imagesByEvent = new Map();
    for (const image of images) {
        const key = String(image.event);
        if (!imagesByEvent.has(key)) imagesByEvent.set(key, []);
        imagesByEvent.get(key).push(image);
    }
    const guestsByEvent = new Map();
    for (const guest of guests) {
        const key = String(guest.event);
        if (!guestsByEvent.has(key)) guestsByEvent.set(key, []);
        guestsByEvent.get(key).push(guest);
    }
    const grossByEvent = new Map();
    for (const order of orders) {
        const key = String(order.event);
        grossByEvent.set(key, (grossByEvent.get(key) || 0) + order.total);
    }
    const unclaimedByEvent = new Map();
    for (const ticket of tickets) {
        const key = String(ticket.event);
        unclaimedByEvent.set(key, (unclaimedByEvent.get(key) || 0) + 1);
    }
    const handlerByEvent = new Map(handlers.map((handler) => [String(handler.event), handler]));

    const result = rows.map((event) => {
        const key = String(event._id);
        const handler = handlerByEvent.get(key);
        const isOwner = String(event.organizer) === String(req.user._id) || req.user.role === 'admin';
        return {
            ...toListItem(event, imagesByEvent.get(key)?.find((image) => image.type === 'cover')?.url || event.imageUrl),
            images: imagesByEvent.get(key) || [],
            guests: guestsByEvent.get(key) || [],
            tickets: publicTicketTypes(event.ticketTypes),
            is_owner: isOwner,
            event_handler_id: handler?._id || null,
            event_handler_type: isOwner ? 'Owner' : (handler?.userType || null),
            commission_percentage: null,
            scanner_permission: handler?.scannerPermission || null,
            gross_sales: isOwner || handler?.userType === 'Event_Scanner' || handler?.userType === 'Manager' ? (grossByEvent.get(key) || 0) : 0,
            gross_sales_currency: 'INR',
            unclaimed_tickets: unclaimedByEvent.get(key) || 0
        };
    });

    return success(res, result, 'Events fetched successfully', 200, {
        pagination: {
            current_page: page,
            last_page: Math.max(1, Math.ceil(total / length)),
            has_next_page: page * length < total
        }
    });
}
