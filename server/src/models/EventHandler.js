import mongoose from 'mongoose';

const allotmentSchema = new mongoose.Schema({
    ticketTypeId: { type: mongoose.Schema.Types.ObjectId },
    quantity: { type: Number, default: 0, min: 0 }
}, { _id: false });

const eventHandlerSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    firstName: String,
    lastName: String,
    userType: { type: String, enum: ['Manager', 'Ambassador', 'Outlet', 'Event_Scanner'], required: true },
    invitationStatus: { type: String, enum: ['P', 'A', 'D'], default: 'P' },
    scannerPermission: { type: String, enum: ['scan_only', 'sell_only', 'both'], default: 'both' },
    commissionPercentage: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    allotments: [allotmentSchema]
}, { timestamps: true });

export default mongoose.model('EventHandler', eventHandlerSchema);
