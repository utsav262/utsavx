import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['cover', 'flyer', 'gallery'], default: 'gallery', index: true },
    sortOrder: { type: Number, default: 0 },
    alt: String
}, { timestamps: true });

schema.index({ event: 1, type: 1, sortOrder: 1 });

export default mongoose.model('EventImage', schema);
