import bcrypt from 'bcryptjs';
import AdminUser from '../models/AdminUser.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Seed the first super_admin on boot from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD.
 * Runs only while no super_admin exists, so it never overwrites a real admin.
 * Remove the variables from the environment once you have signed in.
 */
export async function bootstrapSuperAdmin() {
    const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');
    if (!email && !password) return;

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        console.warn('Admin bootstrap skipped: need a valid ADMIN_BOOTSTRAP_EMAIL and a 12+ character ADMIN_BOOTSTRAP_PASSWORD with a letter and a number.');
        return;
    }
    if (await AdminUser.exists({ role: 'super_admin' })) return;

    const name = String(process.env.ADMIN_BOOTSTRAP_NAME || 'Super Admin').trim();
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await AdminUser.findOneAndUpdate(
        { email },
        { $set: { name, passwordHash, role: 'super_admin', status: 'active' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await AuditLog.create({
        action: 'admin.bootstrap.create',
        adminEmail: 'env',
        targetType: 'AdminUser',
        targetId: String(admin._id),
        after: { email, role: 'super_admin' }
    });
    console.log(`Created super_admin ${email} from ADMIN_BOOTSTRAP_* env. Remove those variables now.`);
}
