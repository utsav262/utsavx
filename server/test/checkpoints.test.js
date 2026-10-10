import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import managerRoutes from '../src/routes/manager.js';
import invitationRoutes from '../src/routes/invitations.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import Ticket from '../src/models/Ticket.js';
import EventHandler from '../src/models/EventHandler.js';
import GlobalSetting from '../src/models/GlobalSetting.js';
import { reserveTicketType } from '../src/services/inventoryService.js';
import { issueTickets } from '../src/services/ticketService.js';

const TEST_URI = process.env.MONGO_URI_TEST_CHECKPOINTS || 'mongodb://127.0.0.1:27017/utsavx_test_checkpoints';
const app = express();
app.use(express.json());
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/invitations', invitationRoutes);
const auth = (u) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(u._id) }, env.jwtSecret)}` });
const inDays = (days) => new Date(Date.now() + days * 864e5).toISOString();
const scan = (u, body, path = '/api/v1/manager/ticket-orders/scan') => request(app).post(path).set(auth(u)).send(body);

let owner, staff, event, lunchTier, plainTier;
const issue = async (tier, extra = {}) => Ticket.create({
    order: new mongoose.Types.ObjectId(), owner: owner._id, event: event._id, ticketType: tier.name,
    ticketTypeId: tier._id, admits: tier.admits || 1, confirmationCode: `C-${new mongoose.Types.ObjectId()}`, ...extra
});

beforeAll(async () => { await mongoose.connect(TEST_URI); });
beforeEach(async () => {
    await Promise.all([User, Event, Ticket, EventHandler, GlobalSetting].map((m) => m.deleteMany({})));
    owner = await User.create({ name: 'Owner', email: 'owner@t.dev', passwordHash: 'x', role: 'admin' });
    staff = await User.create({ name: 'Staff', email: 'staff@t.dev', passwordHash: 'x', role: 'customer' });
    const res = await request(app).post('/api/v1/manager/events/create-or-update').set(auth(owner)).send({
        title: 'Conf', description: 'd', category: 'Corporate', startsAt: inDays(5), endsAt: inDays(5.3), status: 'published',
        ticketTypes: [
            { name: 'Delegate + lunch', price: 500, quantity: 100, admits: 3, includesLunch: true },
            { name: 'Expo only', price: 100, quantity: 100 }
        ]
    });
    event = res.body.result;
    [lunchTier, plainTier] = event.ticketTypes;
    await EventHandler.create({ event: event._id, email: staff.email, user: staff._id, userType: 'Event_Scanner', invitationStatus: 'A', scannerPermission: 'scan_only' });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe('lunch checkpoint on the same QR', () => {
    it('tier flag is saved, serialized and editable', async () => {
        expect(lunchTier.includesLunch).toBe(true);
        const list = await request(app).get(`/api/v1/manager/event-tickets/get-by-event/${event._id}/all`).set(auth(owner));
        expect(list.body.result.map((t) => t.includes_lunch)).toEqual([true, false]);
        const upd = await request(app).post(`/api/v1/manager/event-tickets/update/${plainTier._id}`).set(auth(owner)).send({ includes_lunch: true });
        expect(upd.body.result.includes_lunch).toBe(true);
    });

    it('requires entry first, serves once, and only for people who entered', async () => {
        const ticket = await issue(lunchTier);
        const code = ticket.confirmationCode;
        const early = await scan(owner, { event_id: event._id, code, checkpoint: 'lunch', action: 'scan' });
        expect(early.body.status).toBe('not_checked_in');

        expect((await scan(owner, { event_id: event._id, code, action: 'scan', people_entered: 2 })).status).toBe(200);
        const tooMany = await scan(owner, { event_id: event._id, code, checkpoint: 'lunch', action: 'scan', people_served: 3 });
        expect(tooMany.body.status).toBe('invalid_count');
        const preview = await scan(owner, { event_id: event._id, code, checkpoint: 'lunch' });
        expect(preview.body.message).toBe('Lunch included for 2 people.');
        const served = await scan(owner, { event_id: event._id, code, checkpoint: 'lunch', action: 'scan' });
        expect(served.status).toBe(200);
        expect(served.body.result.lunch_served).toBe(2);
        const again = await scan(owner, { event_id: event._id, code, checkpoint: 'lunch', action: 'scan' });
        expect(again.body.status).toBe('already_claimed');
        // Entry scan is unaffected by the lunch scan.
        expect((await scan(owner, { event_id: event._id, code, action: 'scan' })).body.status).toBe('already_claimed');

        const stats = await request(app).get(`/api/v1/manager/ticket-orders/check-ins/${event._id}`).set(auth(owner));
        expect(stats.body.result).toMatchObject({ lunch_included_people: 3, lunch_eligible_people: 2, lunch_served_people: 2 });
    });

    it('rejects tiers without lunch, and works for gate staff and legacy tickets without a tier id', async () => {
        const plain = await issue(plainTier, { status: 'used', scannedAt: new Date() });
        expect((await scan(owner, { event_id: event._id, code: plain.confirmationCode, checkpoint: 'lunch' })).body.status).toBe('not_included');

        const legacy = await issue(lunchTier, { ticketTypeId: null, status: 'used', scannedAt: new Date(), peopleEntered: 3 });
        const res = await scan(staff, { event_id: event._id, code: legacy.confirmationCode, checkpoint: 'lunch', action: 'scan' }, '/api/v1/invitations/scan');
        expect(res.status).toBe(200);
        expect(res.body.result.lunch_served).toBe(3);
    });

    it('issued tickets remember their tier id', async () => {
        const [ticket] = await issueTickets({ _id: new mongoose.Types.ObjectId(), orderNumber: 'UTX-T', user: owner._id, event: event._id,
            items: [{ ticketTypeId: lunchTier._id, name: lunchTier.name, quantity: 1, admits: 3 }] });
        expect(String(ticket.ticketTypeId)).toBe(String(lunchTier._id));
    });
});

describe('ticket sale windows and fees', () => {
    it('rejects unordered sale windows and sales ending after the event', async () => {
        const base = { eventId: event._id, name: 'Late', price: 100, quantity: 10 };
        const create = (extra) => request(app).post('/api/v1/manager/event-tickets/create').set(auth(owner)).send({ ...base, ...extra });
        expect((await create({ sale_start: inDays(3), sale_end: inDays(2) })).status).toBe(422);
        expect((await create({ sale_end: inDays(9) })).body.message).toBe('Ticket sales must end before the event ends');
        expect((await create({ sale_start: inDays(1), sale_end: inDays(4) })).status).toBe(200);
    });

    it('online checkout honours each tier sale window; gate sales do not', async () => {
        await Event.updateOne({ _id: event._id, 'ticketTypes._id': plainTier._id }, { $set: { 'ticketTypes.$.saleStartsAt': new Date(inDays(1)) } });
        await expect(reserveTicketType(event._id, plainTier._id, 1)).rejects.toThrow('sales have not started yet');
        await expect(reserveTicketType(event._id, plainTier._id, 1, { gate: true })).resolves.toBeTruthy();
        await Event.updateOne({ _id: event._id, 'ticketTypes._id': plainTier._id }, { $set: { 'ticketTypes.$.saleStartsAt': null, 'ticketTypes.$.saleEndsAt': new Date(inDays(-1)) } });
        await expect(reserveTicketType(event._id, plainTier._id, 1)).rejects.toThrow('sales have ended');
    });

    it('fee preview and payouts use the admin fee setting', async () => {
        await GlobalSetting.create({ type: 'country', country: 'India', currency: 'INR', serviceFeePercent: 8 });
        expect((await request(app).get('/api/v1/manager/fees').set(auth(owner))).body.result.service_fee_percent).toBe(8);
        const payouts = await request(app).get(`/api/v1/manager/ticket-orders/payouts/${event._id}`).set(auth(owner));
        expect(payouts.body.result.service_fee_percent).toBe(8);
    });
});
