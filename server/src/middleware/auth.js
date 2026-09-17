import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

export async function requireAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
        if (!token) return res.status(401).json({ message: 'Authentication required' });
        const payload = jwt.verify(token, env.jwtSecret);
        req.user = await User.findById(payload.sub).select('-passwordHash');
        if (!req.user) return res.status(401).json({ message: 'User no longer exists' });
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

export async function optionalAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
        if (token) {
            const payload = jwt.verify(token, env.jwtSecret);
            req.user = await User.findById(payload.sub).select('-passwordHash');
        }
    } catch {
        req.user = null;
    }
    next();
}

export const requireRole = (...roles) => (req, res, next) => (
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Insufficient permissions' })
);

export const requireAdmin = requireRole('admin');
