import mongoose from 'mongoose';

/** Single document (key: 'site') holding public contact details shown in the footer and Contact page. */
const schema = new mongoose.Schema({
    key: { type: String, required: true, unique: true, default: 'site' },
    locations: { type: String, trim: true, default: 'Mumbai · Delhi · Bengaluru' },
    supportEmail: { type: String, trim: true, lowercase: true, default: 'hello@utsavx.com' },
    supportPhone: { type: String, trim: true, default: '+91 99999 99999' },
    supportHours: { type: String, trim: true, default: 'Mon–Sat, 10am–7pm IST' },
    officeAddress: { type: String, trim: true, default: 'MXO Pvt Ltd\nBandra West, Mumbai 400050' },
    social: {
        instagram: { type: String, trim: true, default: '' },
        twitter: { type: String, trim: true, default: '' },
        facebook: { type: String, trim: true, default: '' },
        youtube: { type: String, trim: true, default: '' },
        linkedin: { type: String, trim: true, default: '' }
    }
}, { timestamps: true });

export default mongoose.model('SiteSetting', schema);
