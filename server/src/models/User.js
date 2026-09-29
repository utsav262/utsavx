import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'organizer', 'admin'], default: 'customer', index: true },
    avatarUrl: String,
    /** Suspended accounts cannot sign in or use the API. */
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    suspendedAt: Date,
    suspendedReason: String,
    /** Set by platform admins after checking an organizer's identity. */
    hostVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
