import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import adminRoutes from '../src/admin/routes/index.js';
import AdminUser from '../src/models/AdminUser.js';
import AuditLog from '../src/models/AuditLog.js';
import User from '../src/models/User.js';
import BookingOrder from '../src/models/BookingOrder.js';
import Event from '../src/models/Event.js';

// Never touch the dev database: always a dedicated test DB.
const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/utsavx_test_admin';

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use('/api/admin/v1', adminRoutes);

const PASSWORD = 'Correct-horse-42';
let ip = 0;
const nextIp = () => `10.0.0.${++ip}`; // fresh IP per test so the login limiter doesn't bleed between tests

async function makeAdmin(overrides = {}) {
    return AdminUser.create({
        name: 'Test Admin',
        email: `admin${Math.random().toString(36).slice(2)}@test.dev`,
        passwordHash: await bcrypt.hash(PASSWORD, 4),
        role: 'admin',
        ...overrides
    });
}

async function loginAs(admin) {
    const res = await request(app).post('/api/admin/v1/auth/login')
        .set('X-Forwarded-For', nextIp())
        .send({ email: admin.email, password: PASSWORD });
    return res.body.token;
}

beforeAll(async () => {
    await mongoose.connect(TEST_URI);
});
beforeEach(async () => {
    await Promise.all([AdminUser.deleteMany({}), AuditLog.deleteMany({}), User.deleteMany({}), BookingOrder.deleteMany({}), Event.deleteMany({})]);
});
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

describe('admin auth', () => {
    it('logs in an active admin and records an audit entry', async () => {
        const admin = await makeAdmin();
        const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', nextIp())
            .send({ email: admin.email, password: PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
        expect(res.body.admin.email).toBe(admin.email);
        expect(res.body.admin.passwordHash).toBeUndefined();
        const log = await AuditLog.findOne({ action: 'admin.login', status: 'success' });
        expect(log?.adminEmail).toBe(admin.email);
    });

    it('rejects a wrong password with 401 and audits the failure', async () => {
        const admin = await makeAdmin();
        const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', nextIp())
            .send({ email: admin.email, password: 'wrong-password-1' });
        expect(res.status).toBe(401);
        expect(await AuditLog.countDocuments({ action: 'admin.login', status: 'failure' })).toBe(1);
    });

    it('returns the same 401 for an unknown email', async () => {
        const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', nextIp())
            .send({ email: 'nobody@test.dev', password: PASSWORD });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
    });

    it('blocks disabled admins with 403', async () => {
        const admin = await makeAdmin({ status: 'disabled' });
        const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', nextIp())
            .send({ email: admin.email, password: PASSWORD });
        expect(res.status).toBe(403);
    });

    it('validates the login body (422)', async () => {
        const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', nextIp())
            .send({ email: 'not-an-email' });
        expect(res.status).toBe(422);
    });

    it('rate-limits login to 5 attempts per IP + email', async () => {
        const fixedIp = nextIp();
        const statuses = [];
        for (let i = 0; i < 6; i += 1) {
            const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', fixedIp)
                .send({ email: 'brute@test.dev', password: 'guess-123456' });
            statuses.push(res.status);
        }
        expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
        expect(statuses[5]).toBe(429);
    });

    it('/auth/me returns the admin; /auth/logout is audited', async () => {
        const admin = await makeAdmin({ role: 'support' });
        const token = await loginAs(admin);
        const me = await request(app).get('/api/admin/v1/auth/me').set('Authorization', `Bearer ${token}`);
        expect(me.status).toBe(200);
        expect(me.body.admin.role).toBe('support');
        const out = await request(app).post('/api/admin/v1/auth/logout').set('Authorization', `Bearer ${token}`);
        expect(out.status).toBe(200);
        expect(await AuditLog.countDocuments({ action: 'admin.logout' })).toBe(1);
    });
});

describe('admin authorization', () => {
    it('rejects requests without a token (401)', async () => {
        const res = await request(app).get('/api/admin/v1/dashboard');
        expect(res.status).toBe(401);
    });

    it('rejects a normal user token, even for a role:admin user (401)', async () => {
        const user = await User.create({ name: 'U', email: 'u@test.dev', passwordHash: 'x', role: 'admin' });
        const userToken = jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: '1h' });
        const res = await request(app).get('/api/admin/v1/dashboard').set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(401);
    });

    it('rejects an admin token whose account was disabled after login (403)', async () => {
        const admin = await makeAdmin();
        const token = await loginAs(admin);
        await AdminUser.updateOne({ _id: admin._id }, { status: 'disabled' });
        const res = await request(app).get('/api/admin/v1/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('rejects a token signed with the user secret but admin audience (401)', async () => {
        const admin = await makeAdmin();
        const forged = jwt.sign({ sub: String(admin._id), role: 'super_admin' }, env.jwtSecret, { audience: 'utsavx-admin' });
        const res = await request(app).get('/api/admin/v1/auth/me').set('Authorization', `Bearer ${forged}`);
        expect(res.status).toBe(401);
    });
});

describe('admin dashboard', () => {
    it('returns totals and a daily series for the range', async () => {
        const admin = await makeAdmin({ role: 'support' });
        const token = await loginAs(admin);
        const buyer = await User.create({ name: 'B', email: 'b@test.dev', passwordHash: 'x' });
        const event = await Event.create({
            title: 'Test', description: 'd', category: 'Music', slug: `t-${Date.now()}`, startsAt: new Date(Date.now() + 86400000),
            status: 'published', organizer: buyer._id, venue: { name: 'V', city: 'Delhi', country: 'India' }
        });
        await BookingOrder.create([
            { orderNumber: 'A1', user: buyer._id, event: event._id, items: [{ name: 'GA', quantity: 2, unitPrice: 500 }], total: 1000, status: 'paid', idempotencyKey: 'k1' },
            { orderNumber: 'A2', user: buyer._id, event: event._id, items: [{ name: 'GA', quantity: 1, unitPrice: 500 }], total: 500, status: 'cancelled', idempotencyKey: 'k2' }
        ]);
        const today = new Date().toISOString().slice(0, 10);
        const res = await request(app).get(`/api/admin/v1/dashboard?from=${today}&to=${today}&refresh=1`).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        const { totals, series } = res.body.result;
        expect(totals.gross_sales).toBe(1000);
        expect(totals.tickets_sold).toBe(2);
        expect(totals.paid_orders).toBe(1);
        expect(totals.failed_payments).toBe(1);
        expect(totals.active_events).toBe(1);
        expect(totals.new_users).toBe(1);
        expect(totals.fraud_alerts).toBeNull();
        expect(series).toHaveLength(1);
        expect(series[0].gross_sales).toBe(1000);
    });

    it('rejects an invalid range (422)', async () => {
        const token = await loginAs(await makeAdmin());
        const res = await request(app).get('/api/admin/v1/dashboard?from=2026-05-01&to=2026-01-01').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(422);
    });

    it('rejects malformed dates (422)', async () => {
        const token = await loginAs(await makeAdmin());
        const res = await request(app).get('/api/admin/v1/dashboard?from=yesterday').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(422);
    });
});
