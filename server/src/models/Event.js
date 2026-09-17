import mongoose from 'mongoose';

const ticketTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    price: { type: Number, min: 0, required: true },
    quantity: { type: Number, min: 0, required: true },
    sold: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    salesStatus: { type: String, enum: ['on-sale', 'paused', 'sold-out'], default: 'on-sale' },
    type: { type: String, default: null }
}, { _id: true });

const eventSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, required: true, index: true },
    tags: [String],
    venue: {
        name: String,
        address: String,
        city: { type: String, index: true },
        country: { type: String, index: true },
        latitude: Number,
        longitude: Number
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: Date,
    imageUrl: String,
    status: { type: String, enum: ['draft', 'published', 'sold-out', 'cancelled', 'review_pending'], default: 'draft', index: true },
    featured: { type: Boolean, default: false },
    pageViews: { type: Number, default: 0, min: 0 },
    ticketTypes: [ticketTypeSchema]
}, { timestamps: true });

eventSchema.index({ title: 'text', description: 'text', 'venue.city': 'text', category: 'text' });
eventSchema.index({ status: 1, startsAt: 1, _id: 1 });
eventSchema.index({ 'venue.country': 1, category: 1, status: 1 });

export default mongoose.model('Event', eventSchema);
