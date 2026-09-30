import mongoose from 'mongoose';

/** Per-country marketplace settings: currency, time zones, payment gateway and platform fees. */
const schema = new mongoose.Schema({
    type: { type: String, default: 'country', index: true },
    country: { type: String, required: true, unique: true, trim: true },
    currency: { type: String, default: 'INR' },
    /** Platform service fee taken from each paid ticket. */
    serviceFeePercent: { type: Number, default: 5, min: 0 },
    serviceFeeFlat: { type: Number, default: 0, min: 0 },
    /** Card/UPI processing cost on online sales. */
    paymentFeePercent: { type: Number, default: 2, min: 0 },
    paymentFeeFlat: { type: Number, default: 0, min: 0 },
    paymentGateway: { type: String, enum: ['razorpay', 'stripe'], default: 'razorpay' },
    timezones: {
        type: [{ _id: false, label: String, value: String }],
        default: () => [{ label: 'India Standard Time', value: 'Asia/Kolkata' }]
    }
}, { timestamps: true });

export default mongoose.model('GlobalSetting', schema);
