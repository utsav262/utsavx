import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import BookingOrder from '../models/BookingOrder.js';
import Event from '../models/Event.js';
import GlobalSetting from '../models/GlobalSetting.js';
import Settlement from '../models/Settlement.js';

/** Orders paid in cash at the door or by staff — the platform never received these funds. */
export const CASH_SOURCES = ['CASH SALE', 'GATE SALE'];
const DUE_AFTER_DAYS = 7;

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const RECEIPT_DIR = process.env.RECEIPT_STORAGE_DIR || path.join(serverRoot, 'storage', 'receipts');
export const RECEIPT_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const MAX_RECEIPT_FILES = 5;

const round2 = (n) => Math.round(n * 100) / 100;

/** Platform service fee % deducted from host payouts (admin country setting, default 5). */
export async function feePercent() {
    const setting = await GlobalSetting.findOne({ country: 'India' }).lean() || await GlobalSetting.findOne().lean();
    return Number(setting?.serviceFeePercent ?? 5);
}

/** Platform bank details hosts deposit into (configured via env until an admin setting exists). */
export function platformBank() {
    const bank = {
        account_name: process.env.PLATFORM_BANK_ACCOUNT_NAME || '',
        bank_name: process.env.PLATFORM_BANK_NAME || '',
        account_number: process.env.PLATFORM_BANK_ACCOUNT_NUMBER || '',
        ifsc: process.env.PLATFORM_BANK_IFSC || '',
        upi_id: process.env.PLATFORM_BANK_UPI || ''
    };
    return Object.values(bank).some(Boolean) ? bank : null;
}

function recompute(settlement, orders, pct) {
    const cash = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const tickets = orders.reduce((sum, o) => sum + (o.items || []).reduce((c, i) => c + Number(i.quantity || 0), 0), 0);
    const dates = orders.map((o) => new Date(o.createdAt).getTime()).filter(Number.isFinite);
    settlement.orders = orders.map((o) => o._id);
    settlement.cashCollected = round2(cash);
    settlement.ticketsSold = tickets;
    settlement.feePercent = pct;
    settlement.amountDue = round2((cash * pct) / 100);
    settlement.salesFrom = dates.length ? new Date(Math.min(...dates)) : undefined;
    settlement.salesTo = dates.length ? new Date(Math.max(...dates)) : undefined;
    settlement.dueDate = settlement.salesTo ? new Date(settlement.salesTo.getTime() + DUE_AFTER_DAYS * 86400000) : undefined;
}

/**
 * Attach any new paid cash orders for this organizer's events to one open settlement per event.
 * Idempotent; safe to call on every page load.
 */
export async function syncSettlements(organizerId) {
    const events = await Event.find({ organizer: organizerId }).select('_id').lean();
    if (!events.length) return;
    const pct = await feePercent();
    const loose = await BookingOrder.find({
        event: { $in: events.map((e) => e._id) },
        status: 'paid',
        paymentIntentId: { $in: CASH_SOURCES },
        total: { $gt: 0 },
        settlement: null
    }).select('_id event total items createdAt').lean();

    const byEvent = new Map();
    for (const order of loose) {
        const key = String(order.event);
        if (!byEvent.has(key)) byEvent.set(key, []);
        byEvent.get(key).push(order);
    }

    for (const [eventId, orders] of byEvent) {
        let open = await Settlement.findOne({ organizer: organizerId, event: eventId, status: 'pending' });
        if (!open) open = new Settlement({ organizer: organizerId, event: eventId });
        const existing = open.orders.length
            ? await BookingOrder.find({ _id: { $in: open.orders } }).select('_id total items createdAt').lean()
            : [];
        recompute(open, [...existing, ...orders], pct);
        await open.save();
        // Only claim orders that are still unassigned (a concurrent sync may have taken them).
        await BookingOrder.updateMany({ _id: { $in: orders.map((o) => o._id) }, settlement: null }, { $set: { settlement: open._id } });
    }
}

export function serializeSettlement(row) {
    return {
        _id: row._id,
        event: row.event && typeof row.event === 'object'
            ? { _id: row.event._id, title: row.event.title, startsAt: row.event.startsAt }
            : row.event,
        organizer: row.organizer && typeof row.organizer === 'object' && row.organizer.email
            ? { _id: row.organizer._id, name: row.organizer.name, email: row.organizer.email }
            : row.organizer,
        currency: row.currency,
        cash_collected: row.cashCollected,
        tickets_sold: row.ticketsSold,
        fee_percent: row.feePercent,
        amount_due: row.amountDue,
        orders_count: row.orders?.length || 0,
        sales_period: { start: row.salesFrom, end: row.salesTo },
        due_date: row.dueDate,
        status: row.status,
        receipts: (row.receipts || []).map((r) => ({ _id: r._id, name: r.originalName, type: r.mimeType, size: r.size, uploaded_at: r.uploadedAt })),
        submitted_at: row.submittedAt,
        reviewed_at: row.reviewedAt,
        review_note: row.reviewNote,
        rejected_count: row.rejectedCount
    };
}

/** Host summary: what's owed now + history. */
export async function hostSummary(organizerId) {
    await syncSettlements(organizerId);
    const rows = await Settlement.find({ organizer: organizerId }).populate('event', 'title startsAt').sort({ updatedAt: -1 }).lean();
    const due = rows.filter((r) => r.status === 'pending' && r.amountDue > 0);
    const starts = due.map((r) => r.salesFrom).filter(Boolean).map((d) => new Date(d).getTime());
    const ends = due.map((r) => r.salesTo).filter(Boolean).map((d) => new Date(d).getTime());
    const dueDates = due.map((r) => r.dueDate).filter(Boolean).map((d) => new Date(d).getTime());
    return {
        currency: 'INR',
        total_to_remit: round2(due.reduce((s, r) => s + r.amountDue, 0)),
        total_cash_collected: round2(due.reduce((s, r) => s + r.cashCollected, 0)),
        number_of_events: due.length,
        total_tickets_sold: due.reduce((s, r) => s + r.ticketsSold, 0),
        sales_period: { start: starts.length ? new Date(Math.min(...starts)) : null, end: ends.length ? new Date(Math.max(...ends)) : null },
        deposit_due_date: dueDates.length ? new Date(Math.min(...dueDates)) : null,
        collections: due.map(serializeSettlement),
        history: rows.filter((r) => r.status !== 'pending').map(serializeSettlement),
        bank: platformBank(),
        limits: { max_files: MAX_RECEIPT_FILES, max_bytes: MAX_RECEIPT_BYTES, types: Object.keys(RECEIPT_TYPES) }
    };
}

/** Store validated receipt buffers under random names; returns receipt subdocs. */
export async function storeReceipts(files) {
    await fs.mkdir(RECEIPT_DIR, { recursive: true });
    const stored = [];
    for (const file of files) {
        const ext = RECEIPT_TYPES[file.mimetype];
        const fileName = `${crypto.randomUUID()}${ext}`;
        await fs.writeFile(path.join(RECEIPT_DIR, fileName), file.buffer, { flag: 'wx' });
        stored.push({ fileName, originalName: String(file.originalname || 'receipt').slice(0, 120), mimeType: file.mimetype, size: file.size });
    }
    return stored;
}

/** Absolute path of a stored receipt, guarding against path traversal. */
export function receiptPath(fileName) {
    const safe = path.basename(String(fileName || ''));
    return path.join(RECEIPT_DIR, safe);
}

/** Cheap magic-byte check so a renamed file can't pose as an image/PDF. */
export function looksLike(mime, buffer) {
    const b = buffer.subarray(0, 12);
    if (mime === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8;
    if (mime === 'image/png') return b.toString('hex', 0, 8) === '89504e470d0a1a0a';
    if (mime === 'image/webp') return b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
    if (mime === 'application/pdf') return b.toString('ascii', 0, 5) === '%PDF-';
    return false;
}

export const isObjectId = (id) => mongoose.isValidObjectId(id);
