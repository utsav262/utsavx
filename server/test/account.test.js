import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import accountRoutes from '../src/routes/account.js';
import User from '../src/models/User.js';
import UserAvatar from '../src/models/UserAvatar.js';

const TEST_URI = process.env.MONGO_URI_TEST_ACCOUNT || 'mongodb://127.0.0.1:27017/utsavx_test_account';
const app = express();
app.use(express.json());
app.use('/api/v1/account', accountRoutes);
const auth = (u) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(u._id) }, env.jwtSecret)}` });
const BANK = { account_holder_name: 'Rohan Mehta', bank_name: 'HDFC Bank', branch: 'Andheri', account_number: '50100123456789', ifsc: 'hdfc0001234', account_type: 'savings', upi_id: 'rohan@okhdfc' };

let host, buyer;
beforeAll(async () => { await mongoose.connect(TEST_URI); });
beforeEach(async () => {
    await Promise.all([User, UserAvatar].map((m) => m.deleteMany({})));
    const passwordHash = await bcrypt.hash('oldpass123', 4);
    host = await User.create({ name: 'Host', email: 'host@t.dev', passwordHash, role: 'organizer' });
    buyer = await User.create({ name: 'Buyer', email: 'buyer@t.dev', passwordHash, role: 'customer' });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe('account profile', () => {
    it('updates name and phone, rejects a bad phone', async () => {
        const ok = await request(app).patch('/api/v1/account/profile').set(auth(buyer)).send({ name: 'New Name', phone: '+91 98765 43210' });
        expect(ok.status).toBe(200);
        expect(ok.body.result).toMatchObject({ name: 'New Name', phone: '+91 98765 43210' });
        const bad = await request(app).patch('/api/v1/account/profile').set(auth(buyer)).send({ name: 'X', phone: 'call me' });
        expect(bad.status).toBe(422);
    });

    it('changes password only with the right current password', async () => {
        const wrong = await request(app).post('/api/v1/account/password').set(auth(buyer)).send({ current_password: 'nope', password: 'newpass456' });
        expect(wrong.status).toBe(422);
        expect(wrong.body.errors.current_password).toBeTruthy();
        const ok = await request(app).post('/api/v1/account/password').set(auth(buyer)).send({ current_password: 'oldpass123', password: 'newpass456' });
        expect(ok.status).toBe(200);
        const user = await User.findById(buyer._id).select('+passwordHash');
        expect(await bcrypt.compare('newpass456', user.passwordHash)).toBe(true);
    });

    it('uploads and serves a profile photo', async () => {
        const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8cf00000301010018dd8db00000000049454e44ae426082', 'hex');
        const up = await request(app).post('/api/v1/account/avatar').set(auth(buyer)).attach('avatar', png, { filename: 'a.png', contentType: 'image/png' });
        expect(up.status).toBe(200);
        const img = await request(app).get(up.body.result.avatarUrl.replace(/\?.*/, ''));
        expect(img.status).toBe(200);
        expect(img.headers['content-type']).toBe('image/png');
    });
});

describe('payout bank', () => {
    it('only organizers can set a bank account', async () => {
        const res = await request(app).put('/api/v1/account/payout-bank').set(auth(buyer)).send(BANK);
        expect(res.status).toBe(403);
    });

    it('saves, returns only a masked number, and keeps the number when omitted', async () => {
        const saved = await request(app).put('/api/v1/account/payout-bank').set(auth(host)).send(BANK);
        expect(saved.status).toBe(200);
        expect(saved.body.result).toMatchObject({ ifsc: 'HDFC0001234', account_number: null, account_number_masked: '••••6789' });
        const edit = await request(app).put('/api/v1/account/payout-bank').set(auth(host)).send({ ...BANK, account_number: undefined, branch: 'Bandra' });
        expect(edit.status).toBe(200);
        const user = await User.findById(host._id).lean();
        expect(user.payoutBank).toMatchObject({ accountNumber: '50100123456789', branch: 'Bandra' });
    });

    it('validates IFSC and account number', async () => {
        const res = await request(app).put('/api/v1/account/payout-bank').set(auth(host)).send({ ...BANK, ifsc: 'HDFC1234', account_number: '12ab' });
        expect(res.status).toBe(422);
        expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['ifsc', 'account_number']));
    });
});
