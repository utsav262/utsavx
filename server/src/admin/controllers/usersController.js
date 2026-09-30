import { serializeBank } from '../../controllers/accountController.js';
import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import Event from '../../models/Event.js';
import BookingOrder from '../../models/BookingOrder.js';
import EventHandler from '../../models/EventHandler.js';
import { audit } from '../middleware/audit.js';
import { containsRegex, fail, listQuery, parseBody, sendList } from '../services/listing.js';

export const usersQuery = listQuery({
    role: z.enum(['all', 'customer', 'organizer', 'admin']).default('all'),
    status: z.enum(['all', 'active', 'suspended']).default('all'),
    hostVerified: z.enum(['all', 'yes', 'no']).default('all')
});

const serialize = (u) => ({
    _id: u._id, name: u.name, email: u.email, role: u.role, status: u.status || 'active',
    host_verified: Boolean(u.hostVerified), suspended_reason: u.suspendedReason || null,
    suspended_at: u.suspendedAt || null, created_at: u.createdAt
});
const snap = (u) => ({ role: u.role, status: u.status || 'active', hostVerified: Boolean(u.hostVerified) });

export async function list(req, res) {
    const { q, role, status, hostVerified } = req.validatedQuery;
    const filter = {};
    if (q) filter.$or = [{ name: containsRegex(q) }, { email: containsRegex(q) }];
    if (role !== 'all') filter.role = role;
    if (status === 'suspended') filter.status = 'suspended';
    if (status === 'active') filter.status = { $ne: 'suspended' };
    if (hostVerified !== 'all') filter.hostVerified = hostVerified === 'yes' ? true : { $ne: true };
    return sendList(req, res, {
        model: User, filter, serialize, filename: 'users',
        columns: [
            { label: 'Name', value: 'name' }, { label: 'Email', value: 'email' }, { label: 'Role', value: 'role' },
            { label: 'Status', value: 'status' }, { label: 'Host verified', value: (r) => (r.host_verified ? 'yes' : 'no') },
            { label: 'Joined', value: 'created_at' }
        ]
    });
}

export async function detail(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'User not found');
    const user = await User.findById(req.params.id).lean();
    if (!user) return fail(res, 404, 'User not found');
    const [orders, orderStats, hosted, handlerRoles] = await Promise.all([
        BookingOrder.find({ user: user._id }).populate('event', 'title').sort({ createdAt: -1 }).limit(20).lean(),
        BookingOrder.aggregate([{ $match: { user: user._id, status: 'paid' } }, { $group: { _id: null, n: { $sum: 1 }, spent: { $sum: '$total' } } }]),
        Event.find({ organizer: user._id }).select('title status startsAt').sort({ startsAt: -1 }).limit(20).lean(),
        EventHandler.find({ email: user.email }).populate('event', 'title').select('userType invitationStatus event').lean()
    ]);
    return res.json({
        message: 'OK', code: 200,
        result: {
            ...serialize(user),
            stats: { paid_orders: orderStats[0]?.n || 0, total_spent: orderStats[0]?.spent || 0, events_hosted: hosted.length },
            orders: orders.map((o) => ({ _id: o._id, order_number: o.orderNumber, event: o.event?.title, total: o.total, status: o.status, created_at: o.createdAt })),
            events: hosted.map((e) => ({ _id: e._id, title: e.title, status: e.status, starts_at: e.startsAt })),
            team_roles: handlerRoles.map((h) => ({ event: h.event?.title, role: h.userType, status: h.invitationStatus })),
            phone: user.phone || null,
            // Full number for staff who send payouts; support sees it masked.
            payout_bank: serializeBank(user.payoutBank, { full: req.admin.role !== 'support' })
        }
    });
}

const updateSchema = z.object({
    status: z.enum(['active', 'suspended']).optional(),
    reason: z.string().trim().max(300).optional(),
    hostVerified: z.boolean().optional(),
    role: z.enum(['customer', 'organizer', 'admin']).optional()
}).refine((d) => d.status || d.hostVerified !== undefined || d.role, { message: 'Nothing to change' })
    .refine((d) => d.status !== 'suspended' || d.reason, { message: 'A reason is required to suspend', path: ['reason'] });

export async function update(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'User not found');
    const data = parseBody(updateSchema, req, res);
    if (!data) return undefined;
    if (data.role && req.admin.role !== 'super_admin') return fail(res, 403, 'Only a super admin can change user roles');

    const before = await User.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'User not found');
    const set = {};
    const unset = {};
    if (data.status === 'suspended') Object.assign(set, { status: 'suspended', suspendedAt: new Date(), suspendedReason: data.reason });
    if (data.status === 'active') {
        set.status = 'active';
        Object.assign(unset, { suspendedAt: '', suspendedReason: '' });
    }
    if (data.hostVerified !== undefined) set.hostVerified = data.hostVerified;
    if (data.role) set.role = data.role;
    const after = await User.findByIdAndUpdate(before._id, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { new: true }).lean();

    const action = data.status ? `user.${data.status === 'suspended' ? 'suspend' : 'activate'}` : data.role ? 'user.role' : 'user.host_verify';
    await audit(req, { action, targetType: 'User', targetId: after._id, before: snap(before), after: { ...snap(after), reason: data.reason } });
    return res.json({ message: 'User updated', code: 200, result: serialize(after) });
}
