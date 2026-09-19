import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import EventHandler from '../models/EventHandler.js';
import { env } from '../config/env.js';
import { failure, success } from '../utils/response.js';

const tokenFor = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const STAFF_ROLE_LABELS = {
    Event_Scanner: 'Event Scanner',
    Manager: 'Event Manager',
    Ambassador: 'Ambassador',
    Outlet: 'Outlet'
};

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    username: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl
});

async function enrichUser(user) {
    const base = publicUser(user);
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) {
        return { ...base, staffRole: null, staffRoleLabel: null, staffEvents: [] };
    }

    const handlers = await EventHandler.find({ email, invitationStatus: 'A' })
        .populate('event', 'title startsAt endsAt venue imageUrl status')
        .sort({ updatedAt: -1 })
        .lean();

    if (!handlers.length) {
        return { ...base, staffRole: null, staffRoleLabel: null, staffEvents: [] };
    }

    const primary = handlers.find((row) => row.userType === 'Event_Scanner') || handlers[0];
    return {
        ...base,
        staffRole: primary.userType,
        staffRoleLabel: STAFF_ROLE_LABELS[primary.userType] || primary.userType,
        staffEvents: handlers.map((row) => ({
            handlerId: row._id,
            userType: row.userType,
            roleLabel: STAFF_ROLE_LABELS[row.userType] || row.userType,
            scannerPermission: row.scannerPermission,
            event: row.event
                ? {
                    id: row.event._id,
                    _id: row.event._id,
                    title: row.event.title,
                    startsAt: row.event.startsAt,
                    endsAt: row.event.endsAt,
                    venue: row.event.venue,
                    imageUrl: row.event.imageUrl,
                    status: row.event.status
                }
                : null
        }))
    };
}

export async function register(req, res) {
    const { name, username, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return failure(res, 'An account already exists for this email', 409);
    // Public signup may only create customers or organizers — never admin.
    const safeRole = role === 'organizer' ? 'organizer' : 'customer';
    const user = await User.create({
        name: name || username,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: safeRole
    });
    const profile = await enrichUser(user);
    res.status(201).json({ message: 'Registration successful', token: tokenFor(user), user: profile, result: profile, code: 200 });
}

export async function login(req, res) {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    const valid = user && await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) return failure(res, 'Invalid credentials', 401);
    const profile = await enrichUser(user);
    res.json({ message: 'Login successful', user: profile, token: tokenFor(user), result: profile, code: 200 });
}

export async function me(req, res) {
    return success(res, await enrichUser(req.user));
}

export async function becomeOrganizer(req, res) {
    if (req.user.role === 'organizer' || req.user.role === 'admin') {
        return success(res, await enrichUser(req.user), 'Already a host account');
    }
    if (req.user.role !== 'customer') {
        return failure(res, 'Only customer accounts can become organizers', 403);
    }
    req.user.role = 'organizer';
    await req.user.save();
    const profile = await enrichUser(req.user);
    return res.json({
        message: 'You can now host events',
        user: profile,
        token: tokenFor(req.user),
        result: profile,
        code: 200
    });
}

export function logout(req, res) {
    return success(res, null, 'Logout successful');
}
