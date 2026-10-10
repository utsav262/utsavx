import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import managerRoutes from '../src/routes/manager.js';
import eventRoutes from '../src/routes/events.js';
import orderRoutes from '../src/routes/orders.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import BookingOrder from '../src/models/BookingOrder.js';
import Ticket from '../src/models/Ticket.js';

const TEST_URI = process.env.MONGO_URI_TEST_GROUP || 'mongodb://127.0.0.1:27017/utsavx_test_group_tickets';
const app = express();
app.use(express.json());
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/event', eventRoutes);
app.use('/api/v1/orders', orderRoutes);
const auth = (u) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(u._id) }, env.jwtSecret)}` });

let owner, buyer, event;

beforeAll(async () => { await mongoose.connect(TEST_URI); });
beforeEach(async () => {
    await Promise.all([User, Event, BookingOrder, Ticket].map((m) => m.deleteMany({})));
    owner = await User.create({ name: 'School', email: 'school@t.dev', passwordHash: 'x', role: 'organizer' });
    buyer = await User.create({ name: 'Parent', email: 'parent@t.dev', passwordHash: 'x', role: 'customer' });
    const res = await request(app)
        .post('/api/v1/manager/events/create-or-update')
        .set(auth(owner))
        .send({
            title: 'Annual Day',
            description: 'School function',
            category: 'School',
            startsAt: new Date(Date.now() + 864e5).toISOString(),
            ticketTypes: [{ name: 'Single', price: 100, quantity: 50 }]
        });
    event = res.body.result;
    await Event.updateOne({ _id: event._id }, { $set: { status: 'published' } });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

async function createFamilyTicket(admits = 3) {
    const res = await request(app)
        .post('/api/v1/manager/event-tickets/create')
        .set(auth(owner))
        .send({ eventId: event._id, name: 'Student + 2 Parents', price: 300, quantity: 20, admits });
    expect(res.status).toBe(200);
    return res.body.result;
}

describe('group tickets (one ticket admits several people)', () => {
    it('defaults to 1 person per ticket', async () => {
        const res = await request(app).get(`/api/v1/manager/event-tickets/get-by-event/${event._id}/all`).set(auth(owner));
        expect(res.body.result[0].admits).toBe(1);
    });

    it('manager sets admits; it is clamped, kept on edits and shown publicly', async () => {
        const ticket = await createFamilyTicket(3);
        expect(ticket.admits).toBe(3);

        // Editing other fields keeps admits.
        const updated = await request(app)
            .post(`/api/v1/manager/event-tickets/update/${ticket._id}`)
            .set(auth(owner))
            .send({ price: 350 });
        expect(updated.body.result.admits).toBe(3);

        // Saving the whole event without admits keeps it too.
        const full = await Event.findById(event._id).lean();
        await request(app)
            .post('/api/v1/manager/events/create-or-update')
            .set(auth(owner))
            .send({
                id: event._id,
                ticketTypes: full.ticketTypes.map((t) => ({ _id: t._id, name: t.name, price: t.price, quantity: t.quantity }))
            });
        const after = await Event.findById(event._id).lean();
        expect(after.ticketTypes.find((t) => t.name === 'Student + 2 Parents').admits).toBe(3);

        // Out-of-range values are clamped to 1–20.
        const big = await request(app)
            .post(`/api/v1/manager/event-tickets/update/${ticket._id}`)
            .set(auth(owner))
            .send({ admits: 99 });
        expect(big.body.result.admits).toBe(20);

        const pub = await request(app).get(`/api/v1/event/details/${event.slug}`);
        const types = Object.fromEntries(pub.body.result.tickets.map((t) => [t.name, t.admits]));
        expect(types).toEqual({ Single: 1, 'Student + 2 Parents': 20 });
    });

    it('online purchase issues one pass per ticket that admits the group; scan and check-ins count people', async () => {
        const ticket = await createFamilyTicket(3);
        const order = await request(app)
            .post('/api/v1/orders')
            .set(auth(buyer))
            .send({ eventId: event._id, idempotencyKey: 'grp-1', items: [{ ticketTypeId: ticket._id, quantity: 2 }] });
        expect(order.status).toBe(201);
        expect(order.body.order.items[0].admits).toBe(3);

        const passes = await Ticket.find({ order: order.body.order._id }).lean();
        expect(passes).toHaveLength(2); // two families, one QR each
        expect(passes.every((p) => p.admits === 3)).toBe(true);

        const code = passes[0].confirmationCode;
        const check = await request(app)
            .post('/api/v1/manager/ticket-orders/scan')
            .set(auth(owner))
            .send({ event_id: event._id, code });
        expect(check.body.result.admits).toBe(3);
        expect(check.body.message).toMatch(/Admit 3 people/);

        const scan = await request(app)
            .post('/api/v1/manager/ticket-orders/scan')
            .set(auth(owner))
            .send({ event_id: event._id, code, action: 'scan' });
        expect(scan.body.ticket_status).toBe('scanned');
        expect(scan.body.result.admits).toBe(3);

        // A single scan uses the pass; the same QR can't be reused.
        const again = await request(app)
            .post('/api/v1/manager/ticket-orders/scan')
            .set(auth(owner))
            .send({ event_id: event._id, code, action: 'scan' });
        expect(again.body.status).toBe('already_claimed');

        const stats = await request(app).get(`/api/v1/manager/ticket-orders/check-ins/${event._id}`).set(auth(owner));
        expect(stats.body.result.claimed_tickets).toBe(1);
        expect(stats.body.result.claimed_people).toBe(3);
        expect(stats.body.result.unclaimed_people).toBe(3);

        const overview = await request(app).get(`/api/v1/manager/ticket-orders/sales-overview/${event._id}`).set(auth(owner));
        expect(overview.body.result.tickets_sold).toBe(2);
        expect(overview.body.result.people_sold).toBe(6);
    });

    it('cash/gate sales carry admits; normal tickets keep the old scan message', async () => {
        const family = await createFamilyTicket(3);
        const single = (await Event.findById(event._id).lean()).ticketTypes.find((t) => t.name === 'Single');
        const sale = await request(app)
            .post('/api/v1/manager/ticket-orders/sell')
            .set(auth(owner))
            .send({
                event_id: event._id,
                purchase_source: 'CASH SALE',
                tickets: [
                    { event_ticket_id: family._id, first_name: 'Asha', email: 'asha@t.dev' },
                    { event_ticket_id: single._id, first_name: 'Ravi', email: 'ravi@t.dev' }
                ]
            });
        expect(sale.status).toBe(200);
        const byType = Object.fromEntries(sale.body.result.tickets.map((t) => [t.ticketType, t.admits]));
        expect(byType).toEqual({ 'Student + 2 Parents': 3, Single: 1 });

        const singleCode = sale.body.result.tickets.find((t) => t.ticketType === 'Single').confirmationCode;
        const res = await request(app)
            .post('/api/v1/manager/ticket-orders/scan')
            .set(auth(owner))
            .send({ event_id: event._id, code: singleCode });
        expect(res.body.message).toBe('Ticket is valid!');
        expect(res.body.result.admits).toBe(1);
    });
});

describe('group tickets: counting who actually came', () => {
    async function buyFamilyPasses(count) {
        const ticket = await createFamilyTicket(3);
        const order = await request(app)
            .post('/api/v1/orders')
            .set(auth(buyer))
            .send({ eventId: event._id, idempotencyKey: `grp-${Date.now()}`, items: [{ ticketTypeId: ticket._id, quantity: count }] });
        return Ticket.find({ order: order.body.order._id }).lean();
    }
    const scan = (code, extra = {}) => request(app)
        .post('/api/v1/manager/ticket-orders/scan')
        .set(auth(owner))
        .send({ event_id: event._id, code, action: 'scan', ...extra });

    it('records 2 of 3 when one parent does not come, and reports count people who came', async () => {
        const [first, second, third] = await buyFamilyPasses(3);

        const partial = await scan(first.confirmationCode, { companions_count: 1 }); // holder + 1
        expect(partial.body.ticket_status).toBe('scanned');
        expect(partial.body.result.people_entered).toBe(2);
        expect(partial.body.message).toMatch(/2 of 3 people entered/);

        const holderOnly = await scan(second.confirmationCode, { companions_count: 0 });
        expect(holderOnly.body.result.people_entered).toBe(1);

        // Scanners that send no count (e.g. older app versions) check in the whole group.
        const full = await scan(third.confirmationCode);
        expect(full.body.result.people_entered).toBe(3);
        expect(full.body.message).toMatch(/Admit 3 people together/);

        const stats = await request(app).get(`/api/v1/manager/ticket-orders/check-ins/${event._id}`).set(auth(owner));
        expect(stats.body.result.claimed_tickets).toBe(3);
        expect(stats.body.result.claimed_people).toBe(6); // 2 + 1 + 3
        expect(stats.body.result.no_show_people).toBe(3); // 1 + 2 + 0
        const family = stats.body.result.ticket_types.find((t) => t.name === 'Student + 2 Parents');
        expect(family.claimed_people).toBe(6);
    });

    it('accepts people_entered too, and rejects counts the ticket does not allow without using it', async () => {
        const [pass] = await buyFamilyPasses(1);

        for (const bad of [{ people_entered: 4 }, { people_entered: 0 }, { companions_count: 3 }, { people_entered: 'two' }]) {
            const res = await scan(pass.confirmationCode, bad);
            expect(res.status).toBe(422);
            expect(res.body.message).toBe('This ticket admits 1 to 3 people.');
        }
        expect((await Ticket.findById(pass._id).lean()).status).toBe('valid');

        const ok = await scan(pass.confirmationCode, { people_entered: 2 });
        expect(ok.body.result.people_entered).toBe(2);
        expect((await Ticket.findById(pass._id).lean()).peopleEntered).toBe(2);

        // Still one scan per pass: the missing parent can't use it later.
        const later = await scan(pass.confirmationCode, { people_entered: 1 });
        expect(later.body.status).toBe('already_claimed');
    });
});
