import { z } from 'zod';
import mongoose from 'mongoose';
import Coupon from '../../models/Coupon.js';
import { audit } from '../middleware/audit.js';
import { containsRegex, fail, listQuery, parseBody, sendList } from '../services/listing.js';

export const couponsQuery = listQuery({
    scope: z.enum(['all', 'platform', 'event']).default('all'),
    active: z.enum(['all', 'yes', 'no']).default('all')
});

const serialize = (c) => ({
    _id: c._id, code: c.code, scope: c.event ? 'event' : 'platform',
    event: c.event && typeof c.event === 'object' ? { _id: c.event._id, title: c.event.title } : c.event,
    discount_type: c.discountType, discount_value: c.discountValue, active: c.isActive,
    max_uses: c.maxUses ?? null, used: c.usedCount || 0, starts_at: c.startsAt || null, expires_at: c.expiresAt || null,
    created_by_role: c.createdByRole || 'host', created_at: c.createdAt
});

export async function list(req, res) {
    const { q, scope, active } = req.validatedQuery;
    const filter = {};
    if (q) filter.code = containsRegex(q);
    if (scope === 'platform') filter.event = null;
    if (scope === 'event') filter.event = { $ne: null };
    if (active !== 'all') filter.isActive = active === 'yes';
    return sendList(req, res, {
        model: Coupon, filter, populate: [{ path: 'event', select: 'title' }], serialize, filename: 'coupons',
        columns: [
            { label: 'Code', value: 'code' }, { label: 'Scope', value: 'scope' }, { label: 'Event', value: (r) => r.event?.title },
            { label: 'Type', value: 'discount_type' }, { label: 'Value', value: 'discount_value' }, { label: 'Active', value: (r) => (r.active ? 'yes' : 'no') },
            { label: 'Used', value: 'used' }, { label: 'Max uses', value: 'max_uses' }, { label: 'Expires', value: 'expires_at' }
        ]
    });
}

const base = {
    discount_type: z.enum(['percentage', 'fixed']),
    discount_value: z.coerce.number().positive(),
    max_uses: z.coerce.number().int().positive().nullable().optional(),
    starts_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    expires_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
    active: z.boolean().optional()
};
const checks = (s) => s
    .refine((d) => d.discount_type !== 'percentage' || d.discount_value <= 100, { message: 'A percentage discount cannot exceed 100', path: ['discount_value'] })
    .refine((d) => !d.starts_at || !d.expires_at || new Date(d.starts_at) < new Date(d.expires_at), { message: 'Expiry must be after the start', path: ['expires_at'] });
const createSchema = checks(z.object({ code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'), ...base }));
const updateSchema = checks(z.object(Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v.optional()]))));

const toDoc = (d) => {
    const doc = {};
    if (d.code) doc.code = d.code.toUpperCase();
    if (d.discount_type) doc.discountType = d.discount_type;
    if (d.discount_value !== undefined) doc.discountValue = d.discount_value;
    if (d.max_uses !== undefined) doc.maxUses = d.max_uses;
    if (d.starts_at !== undefined) doc.startsAt = d.starts_at ? new Date(d.starts_at) : null;
    if (d.expires_at !== undefined) doc.expiresAt = d.expires_at ? new Date(d.expires_at) : null;
    if (d.active !== undefined) doc.isActive = d.active;
    return doc;
};

export async function create(req, res) {
    const data = parseBody(createSchema, req, res);
    if (!data) return undefined;
    if (await Coupon.exists({ event: null, code: data.code.toUpperCase() })) return fail(res, 409, 'A platform coupon with this code already exists');
    const coupon = await Coupon.create({ ...toDoc(data), event: null, isActive: data.active ?? true, createdBy: req.admin._id, createdByRole: 'admin' });
    await audit(req, { action: 'coupon.create', targetType: 'Coupon', targetId: coupon._id, after: serialize(coupon.toObject()) });
    return res.status(201).json({ message: 'Coupon created', code: 200, result: serialize(coupon.toObject()) });
}

export async function update(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Coupon not found');
    const data = parseBody(updateSchema, req, res);
    if (!data) return undefined;
    const before = await Coupon.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Coupon not found');
    // Admins may only toggle event coupons on/off; their terms belong to the organizer.
    if (before.event && Object.keys(data).some((k) => k !== 'active')) return fail(res, 403, "Event coupons belong to the organizer — you can only switch them on or off");
    const merged = { discount_type: before.discountType, discount_value: before.discountValue, ...data };
    if (merged.discount_type === 'percentage' && merged.discount_value > 100) return fail(res, 422, 'A percentage discount cannot exceed 100');
    const after = await Coupon.findByIdAndUpdate(before._id, { $set: toDoc(data) }, { new: true }).populate('event', 'title').lean();
    await audit(req, { action: 'coupon.update', targetType: 'Coupon', targetId: after._id, before: serialize(before), after: serialize(after) });
    return res.json({ message: 'Coupon updated', code: 200, result: serialize(after) });
}

export async function remove(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Coupon not found');
    const before = await Coupon.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Coupon not found');
    if (before.event) return fail(res, 403, "Event coupons belong to the organizer — deactivate it instead");
    if (before.usedCount > 0) return fail(res, 409, 'This coupon has been used — deactivate it instead so order history stays intact');
    await Coupon.deleteOne({ _id: before._id });
    await audit(req, { action: 'coupon.delete', targetType: 'Coupon', targetId: before._id, before: serialize(before) });
    return res.json({ message: 'Coupon deleted', code: 200 });
}
