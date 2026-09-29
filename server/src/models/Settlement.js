import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema({
    fileName: String,            // stored name on disk (random)
    originalName: String,
    mimeType: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

/**
 * Cash the host collected offline (cash + gate sales) owes the platform its service fee on.
 * One open (pending) settlement per event; orders attach to it until it is submitted.
 *   pending → submitted (host uploaded transfer receipts) → approved | back to pending (rejected)
 */
const settlementSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BookingOrder' }],
    currency: { type: String, default: 'INR' },
    cashCollected: { type: Number, default: 0 },
    ticketsSold: { type: Number, default: 0 },
    feePercent: { type: Number, default: 5 },
    amountDue: { type: Number, default: 0 },
    salesFrom: Date,
    salesTo: Date,
    dueDate: Date,
    status: { type: String, enum: ['pending', 'submitted', 'approved'], default: 'pending', index: true },
    receipts: [receiptSchema],
    submittedAt: Date,
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    reviewNote: String,
    rejectedCount: { type: Number, default: 0 }
}, { timestamps: true });

settlementSchema.index({ organizer: 1, event: 1, status: 1 });

export default mongoose.model('Settlement', settlementSchema);
