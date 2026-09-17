import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    notificationType: { type: String, default: 'INFO' },
    title: String,
    message: String,
    payload: mongoose.Schema.Types.Mixed,
    readAt: Date
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
