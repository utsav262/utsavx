import mongoose from 'mongoose';

const eventGuestSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    image: String,
    status: { type: String, enum: ['invited', 'confirmed', 'declined'], default: 'invited' }
}, { timestamps: true });

export default mongoose.model('EventGuest', eventGuestSchema);
