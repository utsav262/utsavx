import mongoose from 'mongoose';

/** One row per admin write action: who, what, before/after, from where. */
const auditLogSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', index: true },
    adminEmail: String,
    action: { type: String, required: true, index: true },
    targetType: { type: String, index: true },
    targetId: { type: String, index: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    status: { type: String, enum: ['success', 'failure'], default: 'success' }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
