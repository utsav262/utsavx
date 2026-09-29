import mongoose from 'mongoose';

/** An admin-sent in-app announcement and who it went to (the per-user copies live in Notification). */
const broadcastSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    segment: { type: String, required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    recipients: { type: Number, default: 0 },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    sentByEmail: String
}, { timestamps: true });

export default mongoose.model('Broadcast', broadcastSchema);
