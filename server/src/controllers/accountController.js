import bcrypt from 'bcryptjs';
import multer from 'multer';
import User from '../models/User.js';
import UserAvatar from '../models/UserAvatar.js';
import { failure, success } from '../utils/response.js';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 1024 * 1024;

export const avatarUpload = (req, res, next) =>
    multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
        fileFilter: (_req, file, cb) => cb(null, AVATAR_TYPES.includes(file.mimetype))
    }).single('avatar')(req, res, (error) => {
        if (error?.code === 'LIMIT_FILE_SIZE') return failure(res, 'Photo must be 1 MB or smaller', 422);
        if (error) return next(error);
        return next();
    });

const mask = (number) => (number ? `••••${String(number).slice(-4)}` : null);

/** Bank details as the owner sees them; the full account number never leaves the server. */
export function serializeBank(bank, { full = false } = {}) {
    if (!bank?.accountNumber) return null;
    return {
        account_holder_name: bank.accountHolderName,
        bank_name: bank.bankName,
        branch: bank.branch || '',
        account_number: full ? bank.accountNumber : null,
        account_number_masked: mask(bank.accountNumber),
        ifsc: bank.ifsc,
        account_type: bank.accountType,
        upi_id: bank.upiId || '',
        updated_at: bank.updatedAt
    };
}

const profileOf = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    hostVerified: Boolean(user.hostVerified),
    createdAt: user.createdAt,
    payoutBank: user.role === 'organizer' ? serializeBank(user.payoutBank) : null
});

export async function getProfile(req, res) {
    return success(res, profileOf(req.user));
}

export async function updateProfile(req, res) {
    req.user.name = req.body.name;
    if (req.body.phone !== undefined) req.user.phone = req.body.phone || null;
    await req.user.save();
    return success(res, profileOf(req.user), 'Profile updated');
}

export async function changePassword(req, res) {
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await bcrypt.compare(req.body.current_password, user.passwordHash))) {
        return res.status(422).json({ message: 'Validation failed', errors: { current_password: ['Current password is incorrect'] }, code: 422 });
    }
    if (await bcrypt.compare(req.body.password, user.passwordHash)) {
        return res.status(422).json({ message: 'Validation failed', errors: { password: ['Choose a password different from your current one'] }, code: 422 });
    }
    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    await user.save();
    return success(res, null, 'Password updated');
}

export async function uploadAvatar(req, res) {
    if (!req.file) return failure(res, 'Choose a JPG, PNG or WebP photo', 422);
    await UserAvatar.findOneAndUpdate(
        { user: req.user._id },
        { contentType: req.file.mimetype, data: req.file.buffer },
        { upsert: true }
    );
    req.user.avatarUrl = `/api/v1/account/avatar/${req.user._id}?v=${Date.now()}`;
    await req.user.save();
    return success(res, profileOf(req.user), 'Photo updated');
}

export async function deleteAvatar(req, res) {
    await UserAvatar.deleteOne({ user: req.user._id });
    req.user.avatarUrl = null;
    await req.user.save();
    return success(res, profileOf(req.user), 'Photo removed');
}

/** Public: avatars appear on event pages next to the host's name. */
export async function avatar(req, res) {
    const row = await UserAvatar.findOne({ user: req.params.userId }).lean().catch(() => null);
    if (!row) return res.status(404).end();
    res.set('Content-Type', row.contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(row.data.buffer ? Buffer.from(row.data.buffer) : row.data);
}

export async function getPayoutBank(req, res) {
    return success(res, serializeBank(req.user.payoutBank));
}

export async function updatePayoutBank(req, res) {
    const existing = req.user.payoutBank;
    const accountNumber = req.body.account_number || existing?.accountNumber;
    if (!accountNumber) {
        return res.status(422).json({ message: 'Validation failed', errors: { account_number: ['Account number is required'] }, code: 422 });
    }
    req.user.payoutBank = {
        accountHolderName: req.body.account_holder_name,
        bankName: req.body.bank_name,
        branch: req.body.branch,
        accountNumber,
        ifsc: req.body.ifsc,
        accountType: req.body.account_type,
        upiId: req.body.upi_id,
        updatedAt: new Date()
    };
    await req.user.save();
    return success(res, serializeBank(req.user.payoutBank), 'Bank account saved');
}

export async function deletePayoutBank(req, res) {
    req.user.payoutBank = null;
    await req.user.save();
    return success(res, null, 'Bank account removed');
}
