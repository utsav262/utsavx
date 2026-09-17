import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingOrder', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    ticketType: String,
    confirmationCode: { type: String, required: true, unique: true },
    qrPayload: String,
    status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
    scannedAt: Date
}, { timestamps: true });

export default mongoose.model('Ticket', ticketSchema);
