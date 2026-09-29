import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Receipts go to a throwaway directory for tests.
process.env.RECEIPT_STORAGE_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'utsavx-receipts-'));

const { env } = await import('../src/config/env.js');
const managerRoutes = (await import('../src/routes/manager.js')).default;
const adminRoutes = (await import('../src/admin/routes/index.js')).default;
const User = (await import('../src/models/User.js')).default;
const Event = (await import('../src/models/Event.js')).default;
const BookingOrder = (await import('../src/models/BookingOrder.js')).default;
const Settlement = (await import('../src/models/Settlement.js')).default;
const AdminUser = (await import('../src/models/AdminUser.js')).default;
const AuditLog = (await import('../src/models/AuditLog.js')).default;
const Notification = (await import('../src/models/Notification.js')).default;
const GlobalSetting = (await import('../src/models/GlobalSetting.js')).default;

const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/utsavx_test_settlements';
const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use('/api/v1/manager', managerRoutes);
app.use('/api/admin/v1', adminRoutes);

const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const userToken = (user) => jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: '1h' });
let ipN = 0;

async function adminToken(role) {
    const admin = await AdminUser.create({ name: role, email: `${role}${Date.now()}@t.dev`, passwordHash: await bcrypt.hash('Admin-pass-123', 4), role });
    const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', `10.9.0.${++ipN}`)
        .send({ email: admin.email, password: 'Admin-pass-123' });
    return res.body.token;
}

let host, other, event;
beforeAll(async () => {
    await mongoose.connect(TEST_URI);
});
beforeEach(async () => {
    await Promise.all([User, Event, BookingOrder, Settlement, AdminUser, AuditLog, Notification, GlobalSetting].map((m) => m.deleteMany({})));
    await GlobalSetting.create({ country_id: 101, country: 'India', Online_Service_Fee_percentage: 5 });
    host = await User.create({ name: 'Host', email: 'host@t.dev', passwordHash: 'x', role: 'organizer' });
    other = await User.create({ name: 'Other', email: 'other@t.dev', passwordHash: 'x', role: 'organizer' });
    event = await Event.create({ organizer: host._id, title: 'Gig', slug: `gig-${Date.now()}`, description: 'd', category: 'Music', startsAt: new Date(), status: 'published' });
    const base = { user: host._id, event: event._id, status: 'paid' };
    await BookingOrder.create([
        { ...base, orderNumber: 'C1', items: [{ name: 'GA', quantity: 2, unitPrice: 500 }], total: 1000, paymentIntentId: 'CASH SALE', idempotencyKey: 'c1' },
        { ...base, orderNumber: 'C2', items: [{ name: 'GA', quantity: 1, unitPrice: 1000 }], total: 1000, paymentIntentId: 'GATE SALE', idempotencyKey: 'c2' },
        { ...base, orderNumber: 'O1', items: [{ name: 'GA', quantity: 1, unitPrice: 999 }], total: 999, paymentIntentId: 'pay_online', idempotencyKey: 'o1' },
        { ...base, orderNumber: 'F1', items: [{ name: 'Comp', quantity: 3, unitPrice: 0 }], total: 0, paymentIntentId: 'CASH SALE', idempotencyKey: 'f1' }
    ]);
});
afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await fs.rm(process.env.RECEIPT_STORAGE_DIR, { recursive: true, force: true });
});

const summary = (user) => request(app).get('/api/v1/manager/settlements').set('Authorization', `Bearer ${userToken(user)}`);
const submit = (user, ids, files = [['r.png', PNG, 'image/png']]) => {
    let req = request(app).post('/api/v1/manager/settlements/submit').set('Authorization', `Bearer ${userToken(user)}`);
    ids.forEach((id) => { req = req.field('collection_ids', String(id)); });
    files.forEach(([name, buf, type]) => { req = req.attach('receipts', buf, { filename: name, contentType: type }); });
    return req;
};

describe('host settlements', () => {
    it('counts only paid cash/gate sales with a total, at the platform fee', async () => {
        const res = await summary(host);
        expect(res.status).toBe(200);
        const s = res.body.result;
        expect(s.total_cash_collected).toBe(2000);
        expect(s.total_to_remit).toBe(100);
        expect(s.total_tickets_sold).toBe(3);
        expect(s.number_of_events).toBe(1);
        expect(s.collections).toHaveLength(1);
        expect(s.deposit_due_date).toBeTruthy();
    });

    it('is idempotent and picks up new cash sales into the same open settlement', async () => {
        await summary(host);
        await summary(host);
        await BookingOrder.create({ user: host._id, event: event._id, status: 'paid', orderNumber: 'C3', items: [{ name: 'GA', quantity: 1, unitPrice: 400 }], total: 400, paymentIntentId: 'CASH SALE', idempotencyKey: 'c3' });
        const res = await summary(host);
        expect(res.body.result.collections).toHaveLength(1);
        expect(res.body.result.total_to_remit).toBe(120);
        expect(await Settlement.countDocuments()).toBe(1);
    });

    it("doesn't show another host's settlements", async () => {
        await summary(host);
        const res = await summary(other);
        expect(res.body.result.collections).toHaveLength(0);
    });

    it('rejects customers (403)', async () => {
        const customer = await User.create({ name: 'C', email: 'c@t.dev', passwordHash: 'x' });
        expect((await summary(customer)).status).toBe(403);
    });

    it('submits receipts and moves the settlement to submitted', async () => {
        const id = (await summary(host)).body.result.collections[0]._id;
        const res = await submit(host, [id]);
        expect(res.status).toBe(200);
        expect(res.body.result[0].status).toBe('submitted');
        expect(res.body.result[0].receipts).toHaveLength(1);
        const after = (await summary(host)).body.result;
        expect(after.total_to_remit).toBe(0);
        expect(after.history[0].status).toBe('submitted');
    });

    it('requires at least one receipt', async () => {
        const id = (await summary(host)).body.result.collections[0]._id;
        expect((await submit(host, [id], [])).status).toBe(422);
    });

    it('rejects a file that claims to be PNG but is not', async () => {
        const id = (await summary(host)).body.result.collections[0]._id;
        const res = await submit(host, [id], [['fake.png', Buffer.from('not an image at all'), 'image/png']]);
        expect(res.status).toBe(422);
    });

    it("can't submit another host's settlement (409) or submit twice (409)", async () => {
        const id = (await summary(host)).body.result.collections[0]._id;
        expect((await submit(other, [id])).status).toBe(409);
        expect((await submit(host, [id])).status).toBe(200);
        expect((await submit(host, [id])).status).toBe(409);
    });

    it('serves receipts only to the owner', async () => {
        const id = (await summary(host)).body.result.collections[0]._id;
        const receiptId = (await submit(host, [id])).body.result[0].receipts[0]._id;
        const own = await request(app).get(`/api/v1/manager/settlements/${id}/receipts/${receiptId}`).set('Authorization', `Bearer ${userToken(host)}`);
        expect(own.status).toBe(200);
        expect(own.headers['content-type']).toBe('image/png');
        const theirs = await request(app).get(`/api/v1/manager/settlements/${id}/receipts/${receiptId}`).set('Authorization', `Bearer ${userToken(other)}`);
        expect(theirs.status).toBe(404);
    });
});

describe('admin settlement review', () => {
    async function submitted() {
        const id = (await summary(host)).body.result.collections[0]._id;
        await submit(host, [id]);
        return id;
    }

    it('lists submitted settlements with counts', async () => {
        await submitted();
        const token = await adminToken('support');
        const res = await request(app).get('/api/admin/v1/settlements').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.result).toHaveLength(1);
        expect(res.body.counts.submitted.count).toBe(1);
    });

    it('support can view but not approve (403)', async () => {
        const id = await submitted();
        const token = await adminToken('support');
        const res = await request(app).post(`/api/admin/v1/settlements/${id}/approve`).set('Authorization', `Bearer ${token}`).send({});
        expect(res.status).toBe(403);
    });

    it('a user token cannot reach admin settlements (401)', async () => {
        const res = await request(app).get('/api/admin/v1/settlements').set('Authorization', `Bearer ${userToken(host)}`);
        expect(res.status).toBe(401);
    });

    it('approves once, audits, notifies the host; a second review gets 409', async () => {
        const id = await submitted();
        const token = await adminToken('admin');
        const ok = await request(app).post(`/api/admin/v1/settlements/${id}/approve`).set('Authorization', `Bearer ${token}`).send({});
        expect(ok.status).toBe(200);
        expect(ok.body.result.status).toBe('approved');
        const again = await request(app).post(`/api/admin/v1/settlements/${id}/approve`).set('Authorization', `Bearer ${token}`).send({});
        expect(again.status).toBe(409);
        const log = await AuditLog.findOne({ action: 'settlement.approve' }).lean();
        expect(log.before.status).toBe('submitted');
        expect(log.after.status).toBe('approved');
        expect(await Notification.countDocuments({ user: host._id, notificationType: 'SETTLEMENT_APPROVED' })).toBe(1);
    });

    it('reject needs a note and sends it back to pending for the host', async () => {
        const id = await submitted();
        const token = await adminToken('super_admin');
        expect((await request(app).post(`/api/admin/v1/settlements/${id}/reject`).set('Authorization', `Bearer ${token}`).send({})).status).toBe(422);
        const res = await request(app).post(`/api/admin/v1/settlements/${id}/reject`).set('Authorization', `Bearer ${token}`).send({ note: 'Receipt amount is wrong' });
        expect(res.status).toBe(200);
        const host$ = (await summary(host)).body.result;
        expect(host$.collections[0].review_note).toBe('Receipt amount is wrong');
        expect(host$.total_to_remit).toBe(100);
    });

    it('admin can open the receipt file', async () => {
        const id = await submitted();
        const token = await adminToken('support');
        const detail = await request(app).get(`/api/admin/v1/settlements/${id}`).set('Authorization', `Bearer ${token}`);
        expect(detail.body.result.orders).toHaveLength(2);
        const rid = detail.body.result.receipts[0]._id;
        const file = await request(app).get(`/api/admin/v1/settlements/${id}/receipts/${rid}`).set('Authorization', `Bearer ${token}`);
        expect(file.status).toBe(200);
    });
});
