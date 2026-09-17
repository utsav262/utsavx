import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { failure, success } from '../utils/response.js';

const tokenFor = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const publicUser = (user) => ({ id: user._id, name: user.name, username: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl });

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
    res.status(201).json({ message: 'Registration successful', token: tokenFor(user), user: publicUser(user), result: publicUser(user), code: 200 });
}

export async function login(req, res) {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    const valid = user && await bcrypt.compare(req.body.password, user.passwordHash);
    if (!valid) return failure(res, 'Invalid credentials', 401);
    res.json({ message: 'Login successful', user: publicUser(user), token: tokenFor(user), result: publicUser(user), code: 200 });
}

export async function me(req, res) {
    return success(res, publicUser(req.user));
}

export async function becomeOrganizer(req, res) {
    if (req.user.role === 'organizer' || req.user.role === 'admin') {
        return success(res, publicUser(req.user), 'Already a host account');
    }
    if (req.user.role !== 'customer') {
        return failure(res, 'Only customer accounts can become organizers', 403);
    }
    req.user.role = 'organizer';
    await req.user.save();
    const user = publicUser(req.user);
    return res.json({
        message: 'You can now host events',
        user,
        token: tokenFor(req.user),
        result: user,
        code: 200
    });
}

export function logout(req, res) {
    return success(res, null, 'Logout successful');
}
