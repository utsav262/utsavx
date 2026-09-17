import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    type: { type: String, default: 'country', index: true },
    country_id: { type: Number, required: true, unique: true },
    country: { type: String, required: true, index: true },
    currency: { type: String, default: 'INR' },
    Online_Payment_Fee_percentage: { type: Number, default: 2 },
    Online_Payment_Fee_dollar_amount: { type: Number, default: 0 },
    Online_Service_Fee_percentage: { type: Number, default: 5 },
    Online_Service_Fee_dollar_amount: { type: Number, default: 0 },
    payment_gateway: { type: String, default: 'razorpay' },
    timezone: { type: String, default: '[{"label":"India Standard Time","value":"Asia/Kolkata"}]' },
    verified_ambassador_unlock_fee: { type: Number, default: 0 },
    ticket_outlet_unlock_fee: { type: Number, default: 0 },
    boost_package_unlock_fee: { type: Number, default: 0 },
    complimentary_ticket_bundles: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('GlobalSetting', schema);
