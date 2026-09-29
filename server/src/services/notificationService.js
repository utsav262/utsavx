import Notification from '../models/Notification.js';
import User from '../models/User.js';

/** Create an in-app notification. Silently skips when the recipient has no account yet. */
export async function notifyUser({ userId, email, type, title, message, payload }) {
    let recipient = userId;
    if (!recipient && email) {
        const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('_id').lean();
        recipient = user?._id;
    }
    if (!recipient) return null;
    return Notification.create({ user: recipient, notificationType: type, title, message, payload });
}
