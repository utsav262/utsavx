import mongoose from 'mongoose';

/** Profile photo bytes, kept in Mongo until object storage is configured. */
const schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true }
}, { timestamps: true });

export default mongoose.model('UserAvatar', schema);
