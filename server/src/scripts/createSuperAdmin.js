/**
 * Create (or promote) the first super_admin.
 *   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='S3cure-pass!' ADMIN_NAME='Ops' npm run admin:create
 * Refuses weak passwords. Re-running with an existing email resets that admin's password and role.
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import AdminUser from '../models/AdminUser.js';
import AuditLog from '../models/AuditLog.js';

const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '');
const name = String(process.env.ADMIN_NAME || 'Super Admin').trim();

if (!/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Set ADMIN_EMAIL to a valid email address.');
    process.exit(1);
}
if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('ADMIN_PASSWORD must be at least 12 characters and include a letter and a number.');
    process.exit(1);
}

await mongoose.connect(env.mongoUri);
const passwordHash = await bcrypt.hash(password, 12);
const existing = await AdminUser.findOne({ email });
const admin = existing
    ? Object.assign(existing, { passwordHash, role: 'super_admin', status: 'active', name: name || existing.name })
    : new AdminUser({ name, email, passwordHash, role: 'super_admin', status: 'active' });
await admin.save();
await AuditLog.create({
    action: existing ? 'admin.bootstrap.reset' : 'admin.bootstrap.create',
    adminEmail: 'cli',
    targetType: 'AdminUser',
    targetId: String(admin._id),
    after: { email, role: 'super_admin' }
});
console.log(`${existing ? 'Updated' : 'Created'} super_admin ${email}. Sign in at /admin/login`);
await mongoose.disconnect();
