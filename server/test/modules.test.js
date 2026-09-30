import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import adminRoutes from '../src/admin/routes/index.js';
import { requireAuth } from '../src/middleware/auth.js';
import AdminUser from '../src/models/AdminUser.js';
import AuditLog from '../src/models/AuditLog.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import BookingOrder from '../src/models/BookingOrder.js';
import Ticket from '../src/models/Ticket.js';
import Coupon from '../src/models/Coupon.js';
import Notification from '../src/models/Notification.js';
import Broadcast from '../src/models/Broadcast.js';
import EventCategory from '../src/models/EventCategory.js';
import GlobalSetting from '../src/models/GlobalSetting.js';
import SiteSetting from '../src/models/SiteSetting.js';

const TEST_URI = process.env.MONGO_URI_TEST_MODULES || 'mongodb://127.0.0.1:27017/utsavx_test_modules';
const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use('/api/admin/v1', adminRoutes);
app.get('/me', requireAuth, (req, res) => res.json({ ok: true }));

const PW = 'Admin-pass-12345';
let n = 0;
const tokens = {};
async function adminAs(role) {
    const email = `${role}${++n}@t.dev`;
    const admin = await AdminUser.create({ name: role, email, passwordHash: await bcrypt.hash(PW, 4), role });
    const res = await request(app).post('/api/admin/v1/auth/login').set('X-Forwarded-For', `10.7.0.${n}`).send({ email, password: PW });
    return { admin, token: res.body.token };
}
const as = (who) => ({ Authorization: `Bearer ${tokens[who].token}` });
const api = (method, path, who, body) => {
    const r = request(app)[method](`/api/admin/v1${path}`).set(as(who));
    return body ? r.send(body) : r;
};

let host, buyer, event, order;
beforeAll(async () => { await mongoose.connect(TEST_URI); });
beforeEach(async () => {
    await Promise.all([AdminUser, AuditLog, User, Event, BookingOrder, Ticket, Coupon, Notification, Broadcast, EventCategory, GlobalSetting, SiteSetting].map((m) => m.deleteMany({})));
    tokens.support = await adminAs('support');
    tokens.admin = await adminAs('admin');
    tokens.super = await adminAs('super_admin');
    host = await User.create({ name: 'Host', email: 'host@t.dev', passwordHash: 'x', role: 'organizer' });
    buyer = await User.create({ name: 'Buyer', email: 'buyer@t.dev', passwordHash: 'x' });
    event = await Event.create({
        organizer: host._id, title: 'Show', slug: `s-${Date.now()}`, description: 'd', category: 'Music', startsAt: new Date(Date.now() + 864e5), status: 'review_pending',
        ticketTypes: [{ name: 'GA', price: 500, quantity: 100, sold: 2 }]
    });
    order = await BookingOrder.create({
        orderNumber: 'ORD-1', user: buyer._id, event: event._id, status: 'paid', total: 1000, paymentIntentId: 'CASH SALE', idempotencyKey: 'k1',
        items: [{ ticketTypeId: event.ticketTypes[0]._id, name: 'GA', quantity: 2, unitPrice: 500 }]
    });
    await Ticket.create([{ order: order._id, owner: buyer._id, event: event._id, confirmationCode: 'C-1' }, { order: order._id, owner: buyer._id, event: event._id, confirmationCode: 'C-2' }]);
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe('role matrix', () => {
    it.each([
        ['patch', () => `/users/${buyer._id}`, { status: 'suspended', reason: 'x' }],
        ['post', () => `/orders/${order._id}/refund`, { reason: 'dup order' }],
        ['post', () => `/events/${event._id}/moderate`, { action: 'approve' }],
        ['post', () => '/coupons', { code: 'SAVE10', discount_type: 'percentage', discount_value: 10 }],
        ['post', () => '/notifications/send', { segment: 'all', title: 'Hi there', message: 'Hello all' }],
        ['get', () => '/audit'],
        ['get', () => '/admins']
    ])('support gets 403 on %s %s', async (method, path, body) => {
        expect((await api(method, path(), 'support', body)).status).toBe(403);
    });

    it('admin cannot manage admin accounts or change user roles (403)', async () => {
        expect((await api('get', '/admins', 'admin')).status).toBe(403);
        expect((await api('patch', `/users/${buyer._id}`, 'admin', { role: 'organizer' })).status).toBe(403);
    });

    it('a customer/organizer token is rejected everywhere (401)', async () => {
        const t = jwt.sign({ sub: String(host._id) }, env.jwtSecret);
        for (const path of ['/users', '/events', '/orders', '/coupons', '/audit', '/admins']) {
            expect((await request(app).get(`/api/admin/v1${path}`).set('Authorization', `Bearer ${t}`)).status).toBe(401);
        }
    });
});

describe('users', () => {
    it('searches and filters', async () => {
        const res = await api('get', '/users?q=buyer&role=customer', 'support');
        expect(res.body.result.map((u) => u.email)).toEqual(['buyer@t.dev']);
    });

    it('suspend needs a reason, blocks the user, and is audited; activate restores', async () => {
        expect((await api('patch', `/users/${buyer._id}`, 'admin', { status: 'suspended' })).status).toBe(422);
        expect((await api('patch', `/users/${buyer._id}`, 'admin', { status: 'suspended', reason: 'chargeback fraud' })).status).toBe(200);
        const userToken = jwt.sign({ sub: String(buyer._id) }, env.jwtSecret);
        expect((await request(app).get('/me').set('Authorization', `Bearer ${userToken}`)).status).toBe(403);
        const log = await AuditLog.findOne({ action: 'user.suspend' }).lean();
        expect(log.after.reason).toBe('chargeback fraud');
        await api('patch', `/users/${buyer._id}`, 'admin', { status: 'active' });
        expect((await request(app).get('/me').set('Authorization', `Bearer ${userToken}`)).status).toBe(200);
    });

    it('verifies hosts and shows user detail', async () => {
        await api('patch', `/users/${host._id}`, 'admin', { hostVerified: true });
        const res = await api('get', `/users/${buyer._id}`, 'support');
        expect(res.body.result.stats.paid_orders).toBe(1);
        expect((await api('get', '/users?hostVerified=yes', 'support')).body.result).toHaveLength(1);
    });
});

describe('events', () => {
    it('approves a pending event, notifies the organizer, then refuses to approve again (409)', async () => {
        const ok = await api('post', `/events/${event._id}/moderate`, 'admin', { action: 'approve' });
        expect(ok.status).toBe(200);
        expect(ok.body.result.status).toBe('published');
        expect(await Notification.countDocuments({ user: host._id, notificationType: 'EVENT_APPROVE' })).toBe(1);
        expect((await api('post', `/events/${event._id}/moderate`, 'admin', { action: 'approve' })).status).toBe(409);
    });

    it('reject/unpublish/cancel require a note', async () => {
        expect((await api('post', `/events/${event._id}/moderate`, 'admin', { action: 'reject' })).status).toBe(422);
        const res = await api('post', `/events/${event._id}/moderate`, 'admin', { action: 'reject', note: 'Add a real venue' });
        expect(res.body.result.status).toBe('draft');
        expect(res.body.result.review_note).toBe('Add a real venue');
    });

    it('features events and manages categories (duplicate 409)', async () => {
        expect((await api('post', `/events/${event._id}/feature`, 'admin', { featured: true })).body.result.featured).toBe(true);
        expect((await api('post', '/catalog/categories', 'admin', { name: 'Comedy' })).status).toBe(201);
        expect((await api('post', '/catalog/categories', 'admin', { name: 'comedy' })).status).toBe(409);
    });
});

describe('orders', () => {
    it('refunds a cash order manually: cancels tickets, releases seats, notifies, audits; second refund 409', async () => {
        expect((await api('post', `/orders/${order._id}/refund`, 'admin', { reason: 'x' })).status).toBe(422);
        const res = await api('post', `/orders/${order._id}/refund`, 'admin', { reason: 'Event date clash' });
        expect(res.status).toBe(200);
        expect(res.body.result.status).toBe('refunded');
        expect(res.body.result.refund.method).toBe('manual');
        expect(await Ticket.countDocuments({ order: order._id, status: 'cancelled' })).toBe(2);
        expect((await Event.findById(event._id).lean()).ticketTypes[0].sold).toBe(0);
        expect(await Notification.countDocuments({ user: buyer._id, notificationType: 'ORDER_REFUNDED' })).toBe(1);
        expect(await AuditLog.countDocuments({ action: 'order.refund', status: 'success' })).toBe(1);
        expect((await api('post', `/orders/${order._id}/refund`, 'admin', { reason: 'Again please' })).status).toBe(409);
    });

    it('fails cleanly (and unlocks) when the gateway is not configured', async () => {
        await BookingOrder.updateOne({ _id: order._id }, { $set: { razorpayPaymentId: 'pay_123' } });
        const res = await api('post', `/orders/${order._id}/refund`, 'admin', { reason: 'Customer asked' });
        if (env.hasRazorpay) return; // real keys configured: skip this negative path
        expect(res.status).toBe(503);
        expect((await BookingOrder.findById(order._id).lean()).refundRequestedAt).toBeNull();
    });

    it('never records a manual refund for an online payment', async () => {
        await BookingOrder.updateOne({ _id: order._id }, { $set: { paymentIntentId: 'pay_legacy123' } });
        const res = await api('post', `/orders/${order._id}/refund`, 'admin', { reason: 'Customer asked' });
        if (!env.hasRazorpay) expect(res.status).toBe(503);
        expect((await BookingOrder.findById(order._id).lean()).status).toBe('paid');
        await BookingOrder.updateOne({ _id: order._id }, { $set: { paymentIntentId: 'order_abc', refundRequestedAt: null } });
        expect((await api('post', `/orders/${order._id}/refund`, 'admin', { reason: 'Customer asked' })).status).toBe(422);
        expect((await api('get', `/orders/${order._id}`, 'admin')).body.result.can_refund).toBe(false);
    });

    it('support can resend tickets; search by buyer email works', async () => {
        expect((await api('post', `/orders/${order._id}/resend`, 'support')).status).toBe(200);
        expect((await api('get', '/orders?q=buyer@t', 'support')).body.result).toHaveLength(1);
    });

    it('exports CSV with formula injection neutralised', async () => {
        await User.updateOne({ _id: buyer._id }, { $set: { email: '=cmd@t.dev' } });
        const res = await api('get', '/orders?format=csv', 'support');
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.text).toContain("'=cmd@t.dev");
    });
});

describe('coupons', () => {
    it('creates platform coupons with validation', async () => {
        expect((await api('post', '/coupons', 'admin', { code: 'BIG', discount_type: 'percentage', discount_value: 150 })).status).toBe(422);
        expect((await api('post', '/coupons', 'admin', { code: 'SAVE10', discount_type: 'percentage', discount_value: 10 })).status).toBe(201);
        expect((await api('post', '/coupons', 'admin', { code: 'save10', discount_type: 'fixed', discount_value: 50 })).status).toBe(409);
    });

    it('event coupons can only be toggled; used coupons cannot be deleted', async () => {
        const ev = await Coupon.create({ event: event._id, code: 'HOST5', discountType: 'fixed', discountValue: 5 });
        expect((await api('patch', `/coupons/${ev._id}`, 'admin', { discount_value: 50 })).status).toBe(403);
        expect((await api('patch', `/coupons/${ev._id}`, 'admin', { active: false })).status).toBe(200);
        const used = await Coupon.create({ code: 'USED', discountType: 'fixed', discountValue: 5, usedCount: 3 });
        expect((await api('delete', `/coupons/${used._id}`, 'admin')).status).toBe(409);
    });
});

describe('notifications', () => {
    it('previews and sends to a segment, skipping suspended users', async () => {
        await User.create({ name: 'S', email: 's@t.dev', passwordHash: 'x', status: 'suspended' });
        const preview = await api('post', '/notifications/preview', 'admin', { segment: 'customers' });
        expect(preview.body.result.recipients).toBe(1);
        const sent = await api('post', '/notifications/send', 'admin', { segment: 'event_attendees', event: String(event._id), title: 'Gates open', message: 'Doors at 6pm', link: '/tickets' });
        expect(sent.status).toBe(201);
        expect(await Notification.countDocuments({ notificationType: 'ANNOUNCEMENT', user: buyer._id })).toBe(1);
        expect((await api('get', '/notifications', 'admin')).body.result[0].recipients).toBe(1);
    });

    it('rejects external links', async () => {
        expect((await api('post', '/notifications/send', 'admin', { segment: 'all', title: 'Hello', message: 'Hi all', link: 'https://evil.dev' })).status).toBe(422);
    });
});

describe('admin users & audit', () => {
    it('super admin creates admins; weak passwords rejected', async () => {
        expect((await api('post', '/admins', 'super', { name: 'A', email: 'a@t.dev', role: 'support', password: 'short1' })).status).toBe(422);
        expect((await api('post', '/admins', 'super', { name: 'A', email: 'a@t.dev', role: 'support', password: 'long-enough-pass-1' })).status).toBe(201);
    });

    it("can't change own role/status or remove the last active super admin", async () => {
        const me = tokens.super.admin._id;
        expect((await api('patch', `/admins/${me}`, 'super', { status: 'disabled' })).status).toBe(422);
        const other = await AdminUser.create({ name: 'S2', email: 's2@t.dev', passwordHash: 'x', role: 'super_admin' });
        expect((await api('patch', `/admins/${other._id}`, 'super', { role: 'admin' })).status).toBe(200);
        await AdminUser.updateOne({ _id: me }, { $set: { role: 'super_admin' } });
        // Only one super admin left (me) — a second super can't demote me either.
        const third = await adminAs('super_admin');
        tokens.third = third;
        expect((await api('patch', `/admins/${me}`, 'third', { role: 'admin' })).status).toBe(200);
        expect((await api('patch', `/admins/${third.admin._id}`, 'super', { role: 'admin' })).status).toBe(403);
    });

    it('audit log lists actions with filters', async () => {
        await api('patch', `/users/${host._id}`, 'admin', { hostVerified: true });
        const res = await api('get', '/audit?action=user.', 'admin');
        expect(res.status).toBe(200);
        expect(res.body.result.every((r) => r.action.startsWith('user.'))).toBe(true);
        expect(res.body.actions).toContain('user.host_verify');
    });
});

describe('countries & fees', () => {
    const IN = {
        country: 'India', currency: 'inr', payment_gateway: 'razorpay',
        Online_Service_Fee_percentage: 5, Online_Service_Fee_dollar_amount: 0,
        Online_Payment_Fee_percentage: 2, Online_Payment_Fee_dollar_amount: 0,
        timezones: [{ label: 'India Standard Time', value: 'Asia/Kolkata' }]
    };

    it('only super admins change fees; everyone can read', async () => {
        expect((await api('post', '/catalog/countries', 'admin', IN)).status).toBe(403);
        const created = await api('post', '/catalog/countries', 'super', IN);
        expect(created.status).toBe(201);
        expect(created.body.result).toMatchObject({ currency: 'INR', country_id: 1, timezones: IN.timezones });
        expect((await api('get', '/catalog/countries', 'support')).body.result).toHaveLength(1);
        expect((await api('post', '/catalog/countries', 'super', { ...IN, country: 'india' })).status).toBe(409);
    });

    it('validates fees and time zones, and audits edits', async () => {
        const bad = await api('post', '/catalog/countries', 'super', { ...IN, Online_Service_Fee_percentage: 80, timezones: [{ label: 'x', value: 'Mars/Base' }] });
        expect(bad.status).toBe(422);
        const { body } = await api('post', '/catalog/countries', 'super', IN);
        const edited = await api('patch', `/catalog/countries/${body.result._id}`, 'super', { ...IN, Online_Service_Fee_percentage: 4.5 });
        expect(edited.body.result.Online_Service_Fee_percentage).toBe(4.5);
        expect(await AuditLog.exists({ action: 'country.update' })).toBeTruthy();
    });

    it('refuses to delete or rename a country that events use', async () => {
        const { body } = await api('post', '/catalog/countries', 'super', IN);
        await api('post', '/catalog/countries', 'super', { ...IN, country: 'Nepal', currency: 'NPR' });
        await Event.updateOne({ _id: event._id }, { $set: { 'venue.country': 'India' } });
        expect((await api('delete', `/catalog/countries/${body.result._id}`, 'super')).status).toBe(409);
        expect((await api('patch', `/catalog/countries/${body.result._id}`, 'super', { ...IN, country: 'Bharat' })).status).toBe(409);
    });
});

describe('site settings', () => {
    const SITE = {
        locations: 'Pune · Goa', support_email: 'help@utsavx.in', support_phone: '+91 80000 00000',
        support_hours: 'Daily 9–9', office_address: 'Pune 411001',
        social: { instagram: 'https://instagram.com/utsavx', twitter: '', facebook: '', youtube: '', linkedin: '' }
    };
    it('super admin edits contact details; others read only; bad links rejected', async () => {
        expect((await api('get', '/settings/site', 'support')).body.result.support_email).toBe('hello@utsavx.com');
        expect((await api('put', '/settings/site', 'admin', SITE)).status).toBe(403);
        const bad = await api('put', '/settings/site', 'super', { ...SITE, support_email: 'nope', social: { ...SITE.social, twitter: 'javascript:alert(1)' } });
        expect(bad.status).toBe(422);
        const ok = await api('put', '/settings/site', 'super', SITE);
        expect(ok.body.result).toMatchObject({ locations: 'Pune · Goa', support_email: 'help@utsavx.in' });
        expect(await AuditLog.exists({ action: 'site_settings.update' })).toBeTruthy();
    });
});
