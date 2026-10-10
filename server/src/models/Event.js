import mongoose from 'mongoose';
import { DETAIL_TRACKS, EVENT_FORMATS, LIMITS, ORGANIZER_TYPES, REGISTRATION_MODES, VISIBILITIES } from '../config/eventTaxonomy.js';

const ticketTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    hideDescription: { type: Boolean, default: false },
    price: { type: Number, min: 0, required: true },
    doorPrice: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, min: 0, required: true },
    sold: { type: Number, default: 0, min: 0 },
    /** People one ticket lets in, e.g. 3 = student + mummy + papa. Inventory still counts tickets. */
    admits: { type: Number, min: 1, max: 20, default: 1 },
    /** The same QR can be scanned once at the lunch counter after entry. */
    includesLunch: { type: Boolean, default: false },
    currency: { type: String, default: 'INR' },
    salesStatus: { type: String, enum: ['on-sale', 'paused', 'sold-out'], default: 'on-sale' },
    /** gate | complimentary | null */
    type: { type: String, default: 'gate' },
    /** paid | free */
    ticketType: { type: String, enum: ['paid', 'free'], default: 'paid' },
    saleStartsAt: { type: Date, default: null },
    saleEndsAt: { type: Date, default: null },
    passServiceFeeToBuyer: { type: Boolean, default: false },
    passPaymentFeeToBuyer: { type: Boolean, default: false }
}, { _id: true });

const scheduleRowSchema = new mongoose.Schema({
    time: { type: String, trim: true, maxlength: LIMITS.scheduleTime, default: '' },
    title: { type: String, trim: true, required: true, maxlength: LIMITS.text }
}, { _id: false });

const personRowSchema = new mongoose.Schema({
    name: { type: String, trim: true, required: true, maxlength: LIMITS.text },
    role: { type: String, trim: true, maxlength: LIMITS.text, default: '' }
}, { _id: false });

function detailPath(field) {
    switch (field.type) {
        case 'textarea': return { type: String, trim: true, maxlength: LIMITS.textarea };
        case 'number': return { type: Number, min: 0 };
        case 'boolean': return { type: Boolean };
        case 'select': return { type: String, enum: field.options.map((option) => option.key) };
        case 'list': return { type: [{ type: String, trim: true, maxlength: LIMITS.listItem }], default: undefined };
        case 'schedule': return { type: [scheduleRowSchema], default: undefined };
        case 'people': return { type: [personRowSchema], default: undefined };
        default: return { type: String, trim: true, maxlength: field.maxLength || LIMITS.text };
    }
}

/** One strict sub-document per detail track (education, sports, …), built from the taxonomy. */
const detailsSchema = new mongoose.Schema(
    Object.fromEntries(Object.entries(DETAIL_TRACKS).map(([track, spec]) => [
        track,
        { type: new mongoose.Schema(Object.fromEntries(spec.fields.map((field) => [field.key, detailPath(field)])), { _id: false }), default: undefined }
    ])),
    { _id: false }
);

const keysOf = (rows) => rows.map((row) => row.key);

const eventSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true, maxlength: 5000 },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, trim: true, maxlength: 80, default: '' },
    /** Who runs the event (school, company, individual, …) — separate from what kind of event it is. */
    organizerType: { type: String, enum: keysOf(ORGANIZER_TYPES), default: 'other' },
    organizationName: { type: String, trim: true, maxlength: 140, default: '' },
    eventFormat: { type: String, enum: keysOf(EVENT_FORMATS), default: 'in_person' },
    /** private = reachable by link only: excluded from listings, search and related events. */
    visibility: { type: String, enum: keysOf(VISIBILITIES), default: 'public', index: true },
    /** IANA zone the organizer entered start/end times in. */
    timezone: { type: String, trim: true, maxlength: 64, default: 'Asia/Kolkata' },
    /** Meeting link for online/hybrid events — only shown to ticket holders, never on the public page. */
    onlineUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    academicSession: { type: String, trim: true, maxlength: 40, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    audience: {
        targetAudience: { type: String, trim: true, maxlength: LIMITS.text, default: '' },
        minCapacity: { type: Number, min: 0, default: null },
        maxCapacity: { type: Number, min: 0, default: null }
    },
    registration: {
        mode: { type: String, enum: keysOf(REGISTRATION_MODES), default: 'paid' },
        /** Online sales are refused outside this window (enforced in inventoryService). */
        opensAt: { type: Date, default: null },
        closesAt: { type: Date, default: null }
    },
    details: { type: detailsSchema, default: () => ({}) },
    tags: [String],
    venue: {
        name: String,
        address: String,
        city: { type: String, index: true },
        state: String,
        country: { type: String, index: true },
        latitude: Number,
        longitude: Number
    },
    startsAt: { type: Date, required: true, index: true },
    endsAt: Date,
    imageUrl: String,
    status: { type: String, enum: ['draft', 'published', 'sold-out', 'cancelled', 'review_pending'], default: 'draft', index: true },
    featured: { type: Boolean, default: false },
    /** Last moderation note from a platform admin (shown to the organizer on reject/unpublish). */
    reviewNote: String,
    pageViews: { type: Number, default: 0, min: 0 },
    likes: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    ticketTypes: [ticketTypeSchema]
}, { timestamps: true });

eventSchema.index({ title: 'text', description: 'text', 'venue.city': 'text', category: 'text' });
eventSchema.index({ status: 1, startsAt: 1, _id: 1 });
eventSchema.index({ 'venue.country': 1, category: 1, status: 1 });

export default mongoose.model('Event', eventSchema);
