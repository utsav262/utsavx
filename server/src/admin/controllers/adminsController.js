import { z } from 'zod';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import AdminUser, { ADMIN_ROLES } from '../../models/AdminUser.js';
import { audit } from '../middleware/audit.js';
import { containsRegex, fail, listQuery, parseBody, sendList } from '../services/listing.js';

export const adminsQuery = listQuery({ role: z.enum(['all', ...ADMIN_ROLES]).default('all') });

const serialize = (a) => ({ _id: a._id, name: a.name, email: a.email, role: a.role, status: a.status, last_login_at: a.lastLoginAt || null, created_at: a.createdAt });
const password = z.string().min(12, 'At least 12 characters').max(128).regex(/[A-Za-z]/, 'Include a letter').regex(/[0-9]/, 'Include a number');

export async function list(req, res) {
    const { q, role } = req.validatedQuery;
    const filter = {};
    if (q) filter.$or = [{ name: containsRegex(q) }, { email: containsRegex(q) }];
    if (role !== 'all') filter.role = role;
    return sendList(req, res, {
        model: AdminUser, filter, sort: { role: 1, name: 1 }, serialize, filename: 'admins',
        columns: [{ label: 'Name', value: 'name' }, { label: 'Email', value: 'email' }, { label: 'Role', value: 'role' }, { label: 'Status', value: 'status' }, { label: 'Last login', value: 'last_login_at' }]
    });
}

export async function create(req, res) {
    const data = parseBody(z.object({ name: z.string().trim().min(1).max(80), email: z.string().email().max(254), role: z.enum(ADMIN_ROLES), password }), req, res);
    if (!data) return undefined;
    const email = data.email.toLowerCase();
    if (await AdminUser.exists({ email })) return fail(res, 409, 'An admin with this email already exists');
    const admin = await AdminUser.create({ name: data.name, email, role: data.role, passwordHash: await bcrypt.hash(data.password, 12) });
    await audit(req, { action: 'admin.create', targetType: 'AdminUser', targetId: admin._id, after: serialize(admin.toObject()) });
    return res.status(201).json({ message: 'Admin created', code: 200, result: serialize(admin.toObject()) });
}

/** Never leave the platform without an active super admin. */
async function wouldOrphan(target, next) {
    const losesSuper = target.role === 'super_admin' && target.status === 'active' && (next.role !== 'super_admin' || next.status !== 'active');
    if (!losesSuper) return false;
    return (await AdminUser.countDocuments({ role: 'super_admin', status: 'active', _id: { $ne: target._id } })) === 0;
}

export async function update(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'Admin not found');
    const data = parseBody(z.object({ role: z.enum(ADMIN_ROLES).optional(), status: z.enum(['active', 'disabled']).optional(), password: password.optional() })
        .refine((d) => d.role || d.status || d.password, { message: 'Nothing to change' }), req, res);
    if (!data) return undefined;
    const before = await AdminUser.findById(req.params.id).lean();
    if (!before) return fail(res, 404, 'Admin not found');
    const self = String(before._id) === String(req.admin._id);
    if (self && (data.role || data.status)) return fail(res, 422, "You can't change your own role or status");
    if (await wouldOrphan(before, { role: data.role || before.role, status: data.status || before.status })) {
        return fail(res, 422, 'There must always be at least one active super admin');
    }
    const set = {};
    if (data.role) set.role = data.role;
    if (data.status) set.status = data.status;
    if (data.password) set.passwordHash = await bcrypt.hash(data.password, 12);
    const after = await AdminUser.findByIdAndUpdate(before._id, { $set: set }, { new: true }).lean();
    const action = data.password ? 'admin.password_reset' : data.status ? `admin.${data.status === 'active' ? 'enable' : 'disable'}` : 'admin.role';
    await audit(req, { action, targetType: 'AdminUser', targetId: after._id, before: { role: before.role, status: before.status }, after: { role: after.role, status: after.status, password: data.password ? 'changed' : undefined } });
    return res.json({ message: 'Admin updated', code: 200, result: serialize(after) });
}
