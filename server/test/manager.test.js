import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import managerRoutes from '../src/routes/manager.js';
import eventRoutes from '../src/routes/events.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import EventHandler from '../src/models/EventHandler.js';

const TEST_URI = process.env.MONGO_URI_TEST_MANAGER || 'mongodb://127.0.0.1:27017/utsavx_test_manager';
const app = express();
app.use(express.json());
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/event', eventRoutes);
const auth = (u) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(u._id) }, env.jwtSecret)}` });
const save = (u, body) => request(app).post('/api/v1/manager/events/create-or-update').set(auth(u)).send(body);

let owner, manager, event;
beforeAll(async () => { await mongoose.connect(TEST_URI); });
beforeEach(async () => {
    await Promise.all([User, Event, EventHandler].map((m) => m.deleteMany({})));
    owner = await User.create({ name: 'Owner', email: 'owner@t.dev', passwordHash: 'x', role: 'organizer' });
    manager = await User.create({ name: 'Mgr', email: 'mgr@t.dev', passwordHash: 'x', role: 'organizer' });
    const res = await save(owner, { title: 'Launch Party', description: 'd', category: 'Music', startsAt: new Date(Date.now() + 864e5).toISOString(), ticketTypes: [{ name: 'GA', price: 100, quantity: 10 }] });
    event = res.body.result;
    await EventHandler.create({ event: event._id, email: manager.email, user: manager._id, userType: 'Manager', invitationStatus: 'A' });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe('manager event lifecycle', () => {
    it('keeps the slug (public URL) stable across edits', async () => {
        const res = await save(owner, { id: event._id, title: 'Launch Party (updated)', description: 'new' });
        expect(res.status).toBe(200);
        expect(res.body.result.slug).toBe(event.slug);
    });

    it('organizers cannot self-publish: publish becomes review_pending', async () => {
        const res = await save(owner, { id: event._id, status: 'published' });
        expect(res.body.result.status).toBe('review_pending');
    });

    it('only the owner edits or cancels; an invited Manager gets 403 but can still manage tickets', async () => {
        expect((await save(manager, { id: event._id, title: 'Hijacked' })).status).toBe(403);
        expect((await request(app).get(`/api/v1/manager/events/delete/${event._id}`).set(auth(manager))).status).toBe(403);
        expect((await request(app).get(`/api/v1/manager/event-tickets/get-by-event/${event._id}/all`).set(auth(manager))).status).toBe(200);
        expect((await request(app).get(`/api/v1/manager/events/delete/${event._id}`).set(auth(owner))).status).toBe(200);
    });

    it('draft and pending events are not public; published ones are', async () => {
        expect((await request(app).get(`/api/v1/event/details/${event.slug}`)).status).toBe(404);
        await save(owner, { id: event._id, status: 'published' });
        expect((await request(app).get(`/api/v1/event/details/${event.slug}`)).status).toBe(404);
        await Event.updateOne({ _id: event._id }, { $set: { status: 'published' } });
        expect((await request(app).get(`/api/v1/event/details/${event.slug}`)).status).toBe(200);
    });
});
