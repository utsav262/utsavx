import mongoose from 'mongoose';

export const ADMIN_ROLES = ['super_admin', 'admin', 'support'];

/** Platform staff. Separate from User so a customer/organizer token can never act as an admin. */
const adminUserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'support', index: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    lastLoginAt: Date,
    lastLoginIp: String
}, { timestamps: true });

export default mongoose.model('AdminUser', adminUserSchema);
