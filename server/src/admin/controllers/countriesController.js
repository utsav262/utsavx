import { z } from 'zod';
import mongoose from 'mongoose';
import GlobalSetting from '../../models/GlobalSetting.js';
import Event from '../../models/Event.js';
import { invalidateCatalogCache } from '../../services/cacheService.js';
import { audit } from '../middleware/audit.js';
import { fail, parseBody } from '../services/listing.js';

/** Accepts every IANA name the runtime knows, including aliases like Asia/Kolkata. */
const isTimeZone = (value) => {
    try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
    } catch {
        return false;
    }
};
const money = z.coerce.number().min(0, 'Can’t be negative').max(1_000_000);
const percent = z.coerce.number().min(0, 'Can’t be negative').max(50, 'Must be 50% or less');

const countrySchema = z.object({
    country: z.string().trim().min(2, 'Country name is required').max(80),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. INR'),
    Online_Service_Fee_percentage: percent,
    Online_Service_Fee_dollar_amount: money,
    Online_Payment_Fee_percentage: percent,
    Online_Payment_Fee_dollar_amount: money,
    payment_gateway: z.enum(['razorpay', 'stripe']),
    timezones: z.array(z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().refine(isTimeZone, 'Unknown time zone')
    })).min(1, 'Add at least one time zone').max(10),
    verified_ambassador_unlock_fee: money.default(0),
    ticket_outlet_unlock_fee: money.default(0),
    boost_package_unlock_fee: money.default(0),
    complimentary_ticket_bundles: z.coerce.number().int().min(0).max(100_000).default(0)
});

function decodeZones(raw) {
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(String(raw || '[]'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

const serialize = (row, events = 0) => ({
    _id: row._id,
    country_id: row.country_id,
    country: row.country,
    currency: row.currency,
    Online_Service_Fee_percentage: row.Online_Service_Fee_percentage,
    Online_Service_Fee_dollar_amount: row.Online_Service_Fee_dollar_amount,
    Online_Payment_Fee_percentage: row.Online_Payment_Fee_percentage,
    Online_Payment_Fee_dollar_amount: row.Online_Payment_Fee_dollar_amount,
    payment_gateway: row.payment_gateway,
    timezones: decodeZones(row.timezone),
    verified_ambassador_unlock_fee: row.verified_ambassador_unlock_fee,
    ticket_outlet_unlock_fee: row.ticket_outlet_unlock_fee,
    boost_package_unlock_fee: row.boost_package_unlock_fee,
    complimentary_ticket_bundles: row.complimentary_ticket_bundles,
    events,
    updated_at: row.updatedAt
});

const build = ({ timezones, ...rest }) => ({ ...rest, type: 'country', timezone: JSON.stringify(timezones) });
const nameRegex = (name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

export async function list(req, res) {
    const [rows, usage] = await Promise.all([
        GlobalSetting.find({ type: 'country' }).sort({ country: 1 }).lean(),
        Event.aggregate([{ $group: { _id: { $toLower: '$venue.country' }, n: { $sum: 1 } } }])
    ]);
    const used = new Map(usage.map((u) => [u._id, u.n]));
    return res.json({ message: 'OK', code: 200, result: rows.map((r) => serialize(r, used.get(r.country.toLowerCase()) || 0)) });
}

export async function create(req, res) {
    const data = parseBody(countrySchema, req, res);
    if (!data) return undefined;
    if (await GlobalSetting.exists({ type: 'country', country: nameRegex(data.country) })) return fail(res, 409, 'That country already exists');
    const last = await GlobalSetting.findOne().sort({ country_id: -1 }).select('country_id').lean();
    const doc = (await GlobalSetting.create({ ...build(data), country_id: (last?.country_id || 0) + 1 })).toObject();
    await invalidateCatalogCache();
    await audit(req, { action: 'country.create', targetType: 'GlobalSetting', targetId: doc._id, after: serialize(doc) });
    return res.status(201).json({ message: 'Country added', code: 200, result: serialize(doc) });
}

export async function update(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Country not found');
    const data = parseBody(countrySchema, req, res);
    if (!data) return undefined;
    const before = await GlobalSetting.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Country not found');
    if (await GlobalSetting.exists({ _id: { $ne: before._id }, type: 'country', country: nameRegex(data.country) })) return fail(res, 409, 'That country already exists');
    const eventsUsing = await Event.countDocuments({ 'venue.country': nameRegex(before.country) });
    // Renaming would orphan events that point at the old name.
    if (eventsUsing && data.country.toLowerCase() !== before.country.toLowerCase()) {
        return fail(res, 409, `Can’t rename: ${eventsUsing} event(s) use ${before.country}`);
    }
    const doc = await GlobalSetting.findByIdAndUpdate(before._id, { $set: build(data) }, { new: true, runValidators: true }).lean();
    await invalidateCatalogCache();
    await audit(req, { action: 'country.update', targetType: 'GlobalSetting', targetId: doc._id, before: serialize(before), after: serialize(doc) });
    return res.json({ message: 'Country saved', code: 200, result: serialize(doc, eventsUsing) });
}

export async function remove(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Country not found');
    const before = await GlobalSetting.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Country not found');
    const eventsUsing = await Event.countDocuments({ 'venue.country': nameRegex(before.country) });
    if (eventsUsing) return fail(res, 409, `Can’t delete: ${eventsUsing} event(s) use ${before.country}`);
    if ((await GlobalSetting.countDocuments({ type: 'country' })) <= 1) return fail(res, 409, 'Keep at least one country');
    await GlobalSetting.deleteOne({ _id: before._id });
    await invalidateCatalogCache();
    await audit(req, { action: 'country.delete', targetType: 'GlobalSetting', targetId: before._id, before: serialize(before) });
    return res.json({ message: 'Country deleted', code: 200, result: null });
}
