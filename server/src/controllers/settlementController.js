import fs from 'node:fs';
import multer from 'multer';
import Settlement from '../models/Settlement.js';
import {
    hostSummary, storeReceipts, receiptPath, looksLike, isObjectId, serializeSettlement,
    RECEIPT_TYPES, MAX_RECEIPT_BYTES, MAX_RECEIPT_FILES
} from '../services/settlementService.js';

const fail = (res, code, message) => res.status(code).json({ message, code });

/** Multipart parser for receipts: memory storage, size/count/type limits enforced here and re-checked by content. */
export const receiptUpload = (req, res, next) =>
    multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_RECEIPT_BYTES, files: MAX_RECEIPT_FILES },
        fileFilter: (_req, file, cb) => cb(null, Boolean(RECEIPT_TYPES[file.mimetype]))
    }).array('receipts', MAX_RECEIPT_FILES)(req, res, (error) => {
        if (!error) return next();
        if (error.code === 'LIMIT_FILE_SIZE') return fail(res, 413, 'Each receipt must be 5MB or smaller.');
        if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
            return fail(res, 422, `Upload up to ${MAX_RECEIPT_FILES} receipts.`);
        }
        return fail(res, 400, 'Could not read the uploaded files.');
    });

export async function summary(req, res) {
    return res.json({ message: 'Settlements fetched successfully', code: 200, result: await hostSummary(req.user._id) });
}

export async function submit(req, res) {
    const ids = [].concat(req.body.collection_ids || req.body['collection_ids[]'] || []).map(String).filter(isObjectId);
    const files = req.files || [];
    if (!ids.length) return fail(res, 422, 'Choose at least one settlement to submit.');
    if (!files.length) return fail(res, 422, 'Upload at least one transfer receipt (JPG, PNG, WebP or PDF).');
    if (files.some((f) => !looksLike(f.mimetype, f.buffer))) return fail(res, 422, 'One of the files is not a valid image or PDF.');

    const open = await Settlement.find({ _id: { $in: ids }, organizer: req.user._id, status: 'pending', amountDue: { $gt: 0 } });
    if (open.length !== ids.length) {
        return fail(res, 409, 'Some settlements are no longer open. Refresh and try again.');
    }

    const receipts = await storeReceipts(files);
    const now = new Date();
    // Conditional update: only rows still pending flip to submitted (guards double-submit).
    const result = await Settlement.updateMany(
        { _id: { $in: ids }, organizer: req.user._id, status: 'pending' },
        { $set: { status: 'submitted', submittedAt: now, submittedBy: req.user._id, reviewNote: null }, $push: { receipts: { $each: receipts } } }
    );
    if (result.modifiedCount !== ids.length) {
        return fail(res, 409, 'Some settlements changed while submitting. Refresh and try again.');
    }
    const rows = await Settlement.find({ _id: { $in: ids } }).populate('event', 'title startsAt').lean();
    return res.json({ message: 'Receipts submitted for review', code: 200, result: rows.map(serializeSettlement) });
}

/** Stream a receipt: host who owns the settlement only. */
export async function receipt(req, res) {
    if (!isObjectId(req.params.id)) return fail(res, 404, 'Receipt not found');
    const row = await Settlement.findOne({ _id: req.params.id, organizer: req.user._id }).lean();
    return sendReceipt(res, row, req.params.receiptId);
}

export function sendReceipt(res, row, receiptId) {
    const file = row?.receipts?.find((r) => String(r._id) === String(receiptId));
    if (!file) return fail(res, 404, 'Receipt not found');
    const filePath = receiptPath(file.fileName);
    if (!fs.existsSync(filePath)) return fail(res, 404, 'Receipt file is missing');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName || 'receipt')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return fs.createReadStream(filePath).pipe(res);
}
