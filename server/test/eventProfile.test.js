import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import managerRoutes from '../src/routes/manager.js';
import eventRoutes, { getEventTaxonomy } from '../src/routes/events.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import EventGuest from '../src/models/EventGuest.js';
import EventHandler from '../src/models/EventHandler.js';
import { reserveTicketType } from '../src/services/inventoryService.js';

const TEST_URI = process.env.MONGO_URI_TEST_PROFILE || 'mongodb://127.0.0.1:27017/utsavx_test_event_profile';
const app = express();
app.use(express.json());
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/event', eventRoutes);
app.get('/api/v1/catalog/event-taxonomy', getEventTaxonomy);
const auth = (u) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(u._id) }, env.jwtSecret)}` });
const save = (u, body) => request(app).post('/api/v1/manager/events/create-or-update').set(auth(u)).send(body);
const load = (u, id) => request(app).get(`/api/v1/manager/events/${id}`).set(auth(u));
const inDays = (days) => new Date(Date.now() + days * 864e5).toISOString();
const base = (extra = {}) => ({
    title: 'Event', description: 'About it', startsAt: inDays(10), endsAt: inDays(10.2),
    venue: { name: 'Ground', city: 'Pune', country: 'India' }, status: 'draft', ...extra
});

let owner, other, admin;
beforeAll(async () => { await mongoose.connect(TEST_URI); });
beforeEach(async () => {
    await Promise.all([User, Event, EventGuest, EventHandler].map((m) => m.deleteMany({})));
    owner = await User.create({ name: 'Owner', email: 'owner@t.dev', passwordHash: 'x', role: 'organizer' });
    other = await User.create({ name: 'Other', email: 'other@t.dev', passwordHash: 'x', role: 'organizer' });
    admin = await User.create({ name: 'Admin', email: 'admin@t.dev', passwordHash: 'x', role: 'admin' });
});
afterAll(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

describe('event taxonomy', () => {
    it('serves organizer types, categories and detail-field specs', async () => {
        const res = await request(app).get('/api/v1/catalog/event-taxonomy');
        expect(res.status).toBe(200);
        expect(res.body.result.organizerTypes.map((o) => o.key)).toContain('school');
        expect(res.body.result.categories.find((c) => c.key === 'Personal').subcategories).toContain('Birthday');
        expect(res.body.result.detailTracks.sports.fields.length).toBeGreaterThan(0);
    });
});

describe('organizer + category scenarios', () => {
    it('school Sports Day keeps classes and a student headcount; details persist on reload', async () => {
        const res = await save(owner, base({
            title: 'Annual Sports Day', organizerType: 'school', organizationName: 'DPS Pune',
            category: 'Sports', subcategory: 'Cricket', academicSession: '2026-27',
            details: {
                education: { grades: ['Class 6', 'Class 7', 'Class 7'], studentParticipants: 240, parentConsentRequired: true,
                    teacherCoordinators: [{ name: 'Ms. Rao', role: 'Track events' }, { name: '', role: '' }] },
                sports: { participationType: 'team', teams: ['Red House', 'Blue House'] },
                corporate: { department: 'should be dropped' }
            }
        }));
        expect(res.status).toBe(201);
        const reloaded = (await load(owner, res.body.result._id)).body.result;
        expect(reloaded.organizerType).toBe('school');
        expect(reloaded.details.education.grades).toEqual(['Class 6', 'Class 7']);
        expect(reloaded.details.education.studentParticipants).toBe(240);
        expect(reloaded.details.education.teacherCoordinators).toEqual([{ name: 'Ms. Rao', role: 'Track events' }]);
        expect(reloaded.details.sports.teams).toEqual(['Red House', 'Blue House']);
        expect(reloaded.details.corporate).toBeUndefined();
    });

    it('company product launch stores speakers and agenda', async () => {
        const res = await save(owner, base({
            organizerType: 'company', organizationName: 'Acme', category: 'Corporate', subcategory: 'Product Launch',
            details: { corporate: { attendeeType: 'both', speakers: [{ name: 'Asha', role: 'CEO' }], agenda: [{ time: '10:00', title: 'Keynote' }] } }
        }));
        expect(res.status).toBe(201);
        expect(res.body.result.details.corporate.speakers[0].name).toBe('Asha');
    });

    it('agency concert with several paid ticket types; trainer workshop; sports club tournament', async () => {
        const concert = await save(owner, base({
            organizerType: 'agency', organizationName: 'Loud Co', category: 'Entertainment', subcategory: 'Concert',
            ticketTypes: [{ name: 'GA', price: 999, quantity: 500 }, { name: 'VIP', price: 4999, quantity: 50 }],
            details: { entertainment: { performers: [{ name: 'The Band', role: 'Headliner' }], ageRestriction: '18+' } }
        }));
        expect(concert.status).toBe(201);
        expect(concert.body.result.ticketTypes.map((t) => t.name)).toEqual(['GA', 'VIP']);

        const workshop = await save(owner, base({
            organizerType: 'creator', category: 'Learning', subcategory: 'Masterclass',
            ticketTypes: [{ name: 'Seat', price: 1500, quantity: 20 }],
            details: { learning: { instructorName: 'Kiran', skillLevel: 'beginner', objectives: ['Knife skills'] } }
        }));
        expect(workshop.status).toBe(201);
        expect(workshop.body.result.details.learning.skillLevel).toBe('beginner');

        const tournament = await save(owner, base({
            organizerType: 'sports_club', organizationName: 'FC Pune', category: 'Sports', subcategory: 'Tournament',
            details: { sports: { sportType: 'Football', tournamentFormat: 'knockout', fixtures: [{ time: 'R1', title: 'A vs B' }] } }
        }));
        expect(tournament.status).toBe(201);
        expect(tournament.body.result.details.sports.fixtures[0].title).toBe('A vs B');
    });

    it('private birthday is hidden from listings, and its guest list stays private', async () => {
        const res = await save(owner, base({
            title: 'Riya turns 30', organizerType: 'individual', category: 'Personal', subcategory: 'Birthday', visibility: 'private',
            details: { personal: { hostName: 'Riya', rsvpRequired: true, guestLimit: 40 } }
        }));
        const id = res.body.result._id;
        await EventGuest.create({ event: id, name: 'Sam', email: 'sam@t.dev' });
        await Event.updateOne({ _id: id }, { $set: { status: 'published' } });

        const list = await request(app).get('/api/v1/event/list');
        expect(list.body.result?.data ?? list.body.result ?? []).not.toEqual(expect.arrayContaining([expect.objectContaining({ title: 'Riya turns 30' })]));
        expect(JSON.stringify(list.body)).not.toContain('Riya turns 30');

        const detail = await request(app).get(`/api/v1/event/details/${res.body.result.slug}`);
        expect(detail.status).toBe(200);
        expect(detail.body.result.guests).toEqual([]);
        const personal = detail.body.result.details.find((section) => section.track === 'personal');
        expect(personal.items.map((item) => item.key)).toEqual(['hostName', 'rsvpRequired']);
    });
});

describe('public payload privacy', () => {
    it('omits private detail fields, the meeting link and guest emails', async () => {
        const res = await save(owner, base({
            organizerType: 'school', organizationName: 'DPS', category: 'Education', subcategory: 'Seminar', eventFormat: 'hybrid',
            onlineUrl: 'https://meet.example.com/abc',
            details: { education: { institutionName: 'DPS', emergencyContactName: 'Mr. X', emergencyContactPhone: '999', studentParticipants: 50 } }
        }));
        await EventGuest.create({ event: res.body.result._id, name: 'Dr. Guest', email: 'guest@t.dev' });
        await Event.updateOne({ _id: res.body.result._id }, { $set: { status: 'published' } });
        const detail = await request(app).get(`/api/v1/event/details/${res.body.result.slug}`);
        const text = JSON.stringify(detail.body);
        expect(detail.body.result.guests[0].name).toBe('Dr. Guest');
        for (const secret of ['guest@t.dev', 'meet.example.com', 'Mr. X', '"999"', 'studentParticipants']) expect(text).not.toContain(secret);
        expect(text).toContain('institutionName');
    });
});

describe('validation', () => {
    it.each([
        [{ organizerType: 'pirate' }, 'organizerType'],
        [{ category: 'Personal', subcategory: 'Hackathon' }, 'subcategory'],
        [{ endsAt: inDays(9) }, 'endsAt'],
        [{ audience: { minCapacity: 50, maxCapacity: 10 } }, 'audience.minCapacity'],
        [{ audience: { maxCapacity: -5 } }, 'audience.maxCapacity'],
        [{ imageUrl: 'javascript:alert(1)' }, 'imageUrl'],
        [{ timezone: 'Mars/Olympus' }, 'timezone'],
        [{ registration: { opensAt: inDays(5), closesAt: inDays(4) } }, 'registration.closesAt'],
        [{ registration: { closesAt: inDays(20) } }, 'registration.closesAt'],
        [{ category: 'Sports', details: { sports: { participationType: 'chaos' } } }, 'details.sports.participationType']
    ])('rejects %j', async (extra, field) => {
        const res = await save(owner, base({ category: 'Music', ...extra }));
        expect(res.status).toBe(422);
        expect(res.body.errors).toHaveProperty([field]);
    });

    it('online events may be drafted without a link but not submitted', async () => {
        const draft = await save(owner, base({ category: 'Learning', eventFormat: 'online', organizerType: 'creator' }));
        expect(draft.status).toBe(201);
        const submit = await save(owner, { id: draft.body.result._id, status: 'published' });
        expect(submit.status).toBe(422);
        expect(submit.body.errors).toHaveProperty('onlineUrl');
        const fixed = await save(owner, { id: draft.body.result._id, status: 'published', onlineUrl: 'https://zoom.us/j/1' });
        expect(fixed.body.result.status).toBe('review_pending');
    });

    it('changing category prunes details and stale subcategory', async () => {
        const res = await save(owner, base({ organizerType: 'individual', category: 'Personal', subcategory: 'Birthday', details: { personal: { hostName: 'R' } } }));
        const moved = await save(owner, { id: res.body.result._id, category: 'Travel' });
        expect(moved.status).toBe(200);
        expect(moved.body.result.subcategory).toBe('');
        expect(moved.body.result.details?.personal).toBeUndefined();
    });
});

describe('compatibility & permissions', () => {
    it('legacy events without the new fields load with safe defaults and still save', async () => {
        const legacy = await Event.collection.insertOne({
            organizer: owner._id, title: 'Old gig', slug: 'old-gig', description: 'x', category: 'Music',
            startsAt: new Date(inDays(3)), status: 'draft', ticketTypes: []
        });
        const res = await load(owner, legacy.insertedId);
        expect(res.status).toBe(200);
        expect(res.body.result).toMatchObject({ organizerType: 'other', eventFormat: 'in_person', visibility: 'public', category: 'Music' });
        expect((await save(owner, { id: legacy.insertedId, title: 'Old gig (edited)' })).status).toBe(200);
    });

    it('other organizers cannot load or edit; invited Managers cannot edit details by any route', async () => {
        const res = await save(owner, base({ category: 'Music' }));
        const id = res.body.result._id;
        await EventHandler.create({ event: id, email: other.email, user: other._id, userType: 'Manager', invitationStatus: 'P' });
        expect((await load(other, id)).status).toBe(404);
        expect((await save(other, { id, title: 'Hijack' })).status).toBe(404);
        await EventHandler.updateOne({ event: id }, { $set: { invitationStatus: 'A' } });
        expect((await save(other, { id, title: 'Hijack' })).status).toBe(403);
        expect((await request(app).post(`/api/v1/manager/events/${id}/upgrade`).set(auth(other)).send({ title: 'Hijack' })).status).toBe(403);
        expect((await Event.findById(id)).title).toBe('Event');
    });

    it('organizers cannot set featured, counters or owner through the REST endpoints; admins can publish', async () => {
        const res = await request(app).post('/api/v1/event').set(auth(owner))
            .send({ ...base({ category: 'Music', status: 'published' }), featured: true, pageViews: 999, organizer: other._id });
        expect(res.status).toBe(201);
        expect(res.body.result).toMatchObject({ featured: false, pageViews: 0, status: 'review_pending', organizer: String(owner._id) });
        const patch = await request(app).patch(`/api/v1/event/${res.body.result._id}`).set(auth(owner)).send({ organizer: other._id, likes: 50 });
        expect(patch.body.result).toMatchObject({ organizer: String(owner._id), likes: 0 });

        const byAdmin = await save(admin, base({ category: 'Music', status: 'published' }));
        expect(byAdmin.body.result.status).toBe('published');
    });

    it('rejects non-http image URLs on the gallery endpoint', async () => {
        const res = await save(owner, base({ category: 'Music' }));
        const bad = await request(app).post('/api/v1/manager/event-images/create').set(auth(owner))
            .send({ eventId: res.body.result._id, url: 'javascript:alert(1)', type: 'flyer' });
        expect(bad.status).toBe(422);
    });
});

describe('registration window', () => {
    it('online sales are refused before registration opens and after it closes', async () => {
        const res = await save(admin, base({
            category: 'Music', status: 'published', ticketTypes: [{ name: 'GA', price: 100, quantity: 10 }],
            registration: { mode: 'paid', opensAt: inDays(2), closesAt: inDays(5) }
        }));
        const event = res.body.result;
        const ticketId = event.ticketTypes[0]._id;
        await expect(reserveTicketType(event._id, ticketId, 1)).rejects.toThrow('Registration has not opened yet');
        await Event.updateOne({ _id: event._id }, { $set: { 'registration.opensAt': new Date(inDays(-3)), 'registration.closesAt': new Date(inDays(-1)) } });
        await expect(reserveTicketType(event._id, ticketId, 1)).rejects.toThrow('Registration has closed');
        // Door (gate) sales ignore the online window.
        await expect(reserveTicketType(event._id, ticketId, 1, { gate: true })).resolves.toBeTruthy();
        await Event.updateOne({ _id: event._id }, { $set: { 'registration.closesAt': null } });
        const updated = await reserveTicketType(event._id, ticketId, 1);
        expect(updated.ticketTypes[0].sold).toBe(2);
    });
});
