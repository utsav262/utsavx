import { z } from 'zod';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import BookingOrder from '../../models/BookingOrder.js';
import Notification from '../../models/Notification.js';
import Broadcast from '../../models/Broadcast.js';
import Event from '../../models/Event.js';
import { audit } from '../middleware/audit.js';
import { fail, listQuery, parseBody, sendList } from '../services/listing.js';

export const SEGMENTS = {
    all: 'Everyone (active accounts)',
    customers: 'Customers',
    organizers: 'Organizers',
    verified_hosts: 'Verified hosts',
    event_attendees: "An event's ticket holders"
};
const MAX_RECIPIENTS = 50000;

const segmentSchema = z.object({
    segment: z.enum(Object.keys(SEGMENTS)),
    event: z.string().optional()
}).refine((d) => d.segment !== 'event_attendees' || mongoose.isValidObjectId(d.event), { message: 'Choose an event', path: ['event'] });

const sendSchema = segmentSchema.and(z.object({
    title: z.string().trim().min(3).max(80),
    message: z.string().trim().min(3).max(500),
    link: z.string().trim().regex(/^\/[^\s]*$/, 'Use an in-app path like /events').max(200).optional().or(z.literal(''))
}));

async function recipientIds({ segment, event }) {
    const active = { status: { $ne: 'suspended' } };
    if (segment === 'event_attendees') {
        const buyers = await BookingOrder.distinct('user', { event, status: 'paid' });
        return (await User.find({ _id: { $in: buyers }, ...active }).select('_id').lean()).map((u) => u._id);
    }
    const filter = { ...active };
    if (segment === 'customers') filter.role = 'customer';
    if (segment === 'organizers') filter.role = 'organizer';
    if (segment === 'verified_hosts') Object.assign(filter, { role: 'organizer', hostVerified: true });
    return (await User.find(filter).select('_id').limit(MAX_RECIPIENTS + 1).lean()).map((u) => u._id);
}

export async function preview(req, res) {
    const data = parseBody(segmentSchema, req, res);
    if (!data) return undefined;
    const ids = await recipientIds(data);
    return res.json({ message: 'OK', code: 200, result: { recipients: Math.min(ids.length, MAX_RECIPIENTS), capped: ids.length > MAX_RECIPIENTS } });
}

export async function send(req, res) {
    const data = parseBody(sendSchema, req, res);
    if (!data) return undefined;
    const ids = await recipientIds(data);
    if (!ids.length) return fail(res, 422, 'No one is in that segment');
    if (ids.length > MAX_RECIPIENTS) return fail(res, 422, `That segment is larger than ${MAX_RECIPIENTS} people — narrow it down`);

    const eventTitle = data.event ? (await Event.findById(data.event).select('title').lean())?.title : null;
    const broadcast = await Broadcast.create({
        title: data.title, message: data.message, link: data.link || undefined, segment: data.segment,
        event: data.segment === 'event_attendees' ? data.event : undefined, recipients: ids.length,
        sentBy: req.admin._id, sentByEmail: req.admin.email
    });
    for (let i = 0; i < ids.length; i += 1000) {
        await Notification.insertMany(ids.slice(i, i + 1000).map((user) => ({
            user, notificationType: 'ANNOUNCEMENT', title: data.title, message: data.message,
            payload: { broadcastId: broadcast._id, link: data.link || null }
        })), { ordered: false });
    }
    await audit(req, { action: 'notification.broadcast', targetType: 'Broadcast', targetId: broadcast._id, after: { segment: data.segment, event: eventTitle, recipients: ids.length, title: data.title } });
    return res.status(201).json({ message: `Sent to ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`, code: 200, result: { _id: broadcast._id, recipients: ids.length } });
}

export const historyQuery = listQuery({});

export async function history(req, res) {
    return sendList(req, res, {
        model: Broadcast, populate: [{ path: 'event', select: 'title' }], filename: 'broadcasts',
        serialize: (b) => ({ _id: b._id, title: b.title, message: b.message, link: b.link, segment: b.segment, segment_label: SEGMENTS[b.segment], event: b.event?.title || null, recipients: b.recipients, sent_by: b.sentByEmail, created_at: b.createdAt }),
        columns: [{ label: 'Title', value: 'title' }, { label: 'Segment', value: 'segment_label' }, { label: 'Recipients', value: 'recipients' }, { label: 'Sent by', value: 'sent_by' }, { label: 'Sent', value: 'created_at' }]
    });
}
