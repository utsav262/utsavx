import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    country: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: { type: Number, default: 1 }
}, { timestamps: true });

schema.index({ country: 1, name: 1 }, { unique: true });

export default mongoose.model('EventCity', schema);
