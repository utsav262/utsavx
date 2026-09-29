import jwt from 'jsonwebtoken';
import AdminUser from '../../models/AdminUser.js';
import { env } from '../../config/env.js';

export const ADMIN_AUDIENCE = 'utsavx-admin';

export function signAdminToken(admin) {
    return jwt.sign({ sub: String(admin._id), role: admin.role }, env.adminJwtSecret, {
        expiresIn: env.adminJwtExpiresIn,
        audience: ADMIN_AUDIENCE
    });
}

/** Verifies an admin token (own secret + audience) and loads an active AdminUser. */
export async function requireAdminAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return res.status(401).json({ message: 'Admin authentication required', code: 401 });
        const payload = jwt.verify(token, env.adminJwtSecret, { audience: ADMIN_AUDIENCE });
        const admin = await AdminUser.findById(payload.sub).lean();
        if (!admin) return res.status(401).json({ message: 'Admin account no longer exists', code: 401 });
        if (admin.status !== 'active') return res.status(403).json({ message: 'Admin account is disabled', code: 403 });
        req.admin = admin;
        return next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired admin session', code: 401 });
    }
}

/** Role gate: allowRoles('super_admin', 'admin'). */
export const allowRoles = (...roles) => (req, res, next) =>
    roles.includes(req.admin?.role)
        ? next()
        : res.status(403).json({ message: 'Your admin role cannot perform this action', code: 403 });
