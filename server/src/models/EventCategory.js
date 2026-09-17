import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.model('EventCategory', schema);
