import mongoose from 'mongoose';

const bookingOrderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Set on cash/gate/complimentary sells — the manager/staff who completed the sale. */
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    items: [{
        ticketTypeId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        unitPrice: Number
    }],
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'paid', 'cancelled', 'refunded'], default: 'pending', index: true },
    idempotencyKey: { type: String, required: true, index: true },
    /** When set, pending inventory is released after this time if unpaid. */
    holdExpiresAt: { type: Date, default: null, index: true },
    paymentIntentId: String,
    /** Cash/gate sales: the settlement the platform fee on this order is remitted through. */
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement', default: null, index: true },
    razorpayPaymentId: String,
    /** Refund bookkeeping (admin-initiated). refundRequestedAt doubles as a lock against double refunds. */
    refundRequestedAt: { type: Date, default: null },
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    refundReason: String,
    refundMethod: { type: String, enum: ['razorpay', 'stripe', 'manual'] },
    refundReference: String
}, { timestamps: true });

bookingOrderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });
bookingOrderSchema.index({ status: 1, holdExpiresAt: 1 });

export default mongoose.model('BookingOrder', bookingOrderSchema);
