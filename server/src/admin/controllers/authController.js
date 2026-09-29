import bcrypt from 'bcryptjs';
import AdminUser from '../../models/AdminUser.js';
import { signAdminToken } from '../middleware/requireAdmin.js';
import { audit } from '../middleware/audit.js';

export const publicAdmin = (admin) => ({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt
});

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export async function login(req, res) {
    const { email, password } = req.body;
    const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    const valid = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);

    if (!admin || !valid) {
        await audit(req, {
            action: 'admin.login',
            targetType: 'AdminUser',
            targetId: admin?._id,
            after: { email },
            status: 'failure',
            admin: admin ? { _id: admin._id, email: admin.email } : { email }
        });
        return res.status(401).json({ message: 'Invalid email or password', code: 401 });
    }
    if (admin.status !== 'active') {
        await audit(req, { action: 'admin.login', targetType: 'AdminUser', targetId: admin._id, status: 'failure', admin });
        return res.status(403).json({ message: 'This admin account is disabled', code: 403 });
    }

    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.ip;
    await admin.save();
    await audit(req, { action: 'admin.login', targetType: 'AdminUser', targetId: admin._id, admin });
    return res.json({ message: 'Login successful', code: 200, token: signAdminToken(admin), admin: publicAdmin(admin) });
}

export async function me(req, res) {
    return res.json({ message: 'OK', code: 200, admin: publicAdmin(req.admin) });
}

export async function logout(req, res) {
    await audit(req, { action: 'admin.logout', targetType: 'AdminUser', targetId: req.admin._id });
    return res.json({ message: 'Logged out', code: 200 });
}
