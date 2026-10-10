import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingOrder', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ticketType: String,
    /** Tier this pass was issued from (older tickets only have the tier name). */
    ticketTypeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    /** People this one pass admits together (group / family tickets). */
    admits: { type: Number, min: 1, default: 1 },
    confirmationCode: { type: String, required: true, unique: true },
    qrPayload: String,
    status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
    scannedAt: Date,
    /** Set at check-in: how many of `admits` actually came in (e.g. 2 of 3). */
    peopleEntered: { type: Number, min: 1, default: null },
    /** Lunch counter scan (tiers with includesLunch): when, and for how many of the people who entered. */
    lunchServedAt: { type: Date, default: null },
    lunchServed: { type: Number, min: 1, default: null }
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
