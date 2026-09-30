import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'organizer', 'admin'], default: 'customer', index: true },
    avatarUrl: String,
    phone: { type: String, trim: true, default: null },
    /** Where the platform pays out this host. Only organizers can set it. */
    payoutBank: {
        type: new mongoose.Schema({
            accountHolderName: { type: String, trim: true },
            bankName: { type: String, trim: true },
            branch: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifsc: { type: String, trim: true, uppercase: true },
            accountType: { type: String, enum: ['savings', 'current'] },
            upiId: { type: String, trim: true },
            updatedAt: Date
        }, { _id: false }),
        default: null
    },
    /** Suspended accounts cannot sign in or use the API. */
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    suspendedAt: Date,
    suspendedReason: String,
    /** Set by platform admins after checking an organizer's identity. */
    hostVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
