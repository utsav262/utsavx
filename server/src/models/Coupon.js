import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    maxUses: Number,
    usedCount: { type: Number, default: 0 }
}, { timestamps: true });

couponSchema.index({ event: 1, code: 1 }, { unique: true });

export default mongoose.model('Coupon', couponSchema);
