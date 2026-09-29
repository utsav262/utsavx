import Settlement from '../../models/Settlement.js';
import { serializeSettlement, isObjectId } from '../../services/settlementService.js';
import { sendReceipt } from '../../controllers/settlementController.js';
import { notifyUser } from '../../services/notificationService.js';
import { audit } from '../middleware/audit.js';

const fail = (res, code, message) => res.status(code).json({ message, code });
const snapshot = (row) => ({ status: row.status, amountDue: row.amountDue, reviewNote: row.reviewNote || null, receipts: row.receipts?.length || 0 });

export async function list(req, res) {
    const { status, page, limit } = req.validatedQuery;
    const filter = status && status !== 'all' ? { status } : {};
    const [rows, total, counts] = await Promise.all([
        Settlement.find(filter)
            .populate('event', 'title startsAt')
            .populate('organizer', 'name email')
            .sort({ status: 1, submittedAt: -1, updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Settlement.countDocuments(filter),
        Settlement.aggregate([{ $group: { _id: '$status', n: { $sum: 1 }, due: { $sum: '$amountDue' } } }])
    ]);
    return res.json({
        message: 'Settlements fetched successfully',
        code: 200,
        result: rows.map(serializeSettlement),
        pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
        counts: Object.fromEntries(counts.map((c) => [c._id, { count: c.n, amount_due: c.due }]))
    });
}

export async function detail(req, res) {
    if (!isObjectId(req.params.id)) return fail(res, 404, 'Settlement not found');
    const row = await Settlement.findById(req.params.id)
        .populate('event', 'title startsAt')
        .populate('organizer', 'name email')
        .populate('orders', 'orderNumber total items createdAt paymentIntentId')
        .lean();
    if (!row) return fail(res, 404, 'Settlement not found');
    return res.json({
        message: 'Settlement fetched successfully',
        code: 200,
        result: {
            ...serializeSettlement(row),
            orders: (row.orders || []).map((o) => ({
                _id: o._id,
                order_number: o.orderNumber,
                total: o.total,
                tickets: (o.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0),
                source: o.paymentIntentId,
                created_at: o.createdAt
            }))
        }
    });
}

export async function receipt(req, res) {
    if (!isObjectId(req.params.id)) return fail(res, 404, 'Receipt not found');
    const row = await Settlement.findById(req.params.id).lean();
    return sendReceipt(res, row, req.params.receiptId);
}

async function review(req, res, approve) {
    if (!isObjectId(req.params.id)) return fail(res, 404, 'Settlement not found');
    const note = String(req.body?.note || '').trim().slice(0, 500);
    if (!approve && !note) return fail(res, 422, 'Add a note so the host knows what to fix.');

    const before = await Settlement.findById(req.params.id).populate('event', 'title').lean();
    if (!before) return fail(res, 404, 'Settlement not found');
    if (before.status !== 'submitted') return fail(res, 409, `Only submitted settlements can be reviewed (this one is ${before.status}).`);

    // Conditional update so two admins can't review the same settlement twice.
    const update = approve
        ? { $set: { status: 'approved', reviewedAt: new Date(), reviewedBy: req.admin._id, reviewNote: note || null } }
        : { $set: { status: 'pending', reviewedAt: new Date(), reviewedBy: req.admin._id, reviewNote: note }, $inc: { rejectedCount: 1 } };
    const after = await Settlement.findOneAndUpdate({ _id: before._id, status: 'submitted' }, update, { new: true }).lean();
    if (!after) return fail(res, 409, 'This settlement was just reviewed by someone else.');

    await audit(req, {
        action: approve ? 'settlement.approve' : 'settlement.reject',
        targetType: 'Settlement',
        targetId: after._id,
        before: snapshot(before),
        after: snapshot(after)
    });
    await notifyUser({
        userId: after.organizer,
        type: approve ? 'SETTLEMENT_APPROVED' : 'SETTLEMENT_REJECTED',
        title: approve ? 'Settlement approved' : 'Settlement needs attention',
        message: approve
            ? `Your ₹${after.amountDue} remittance for ${before.event?.title || 'your event'} was approved.`
            : `Your remittance for ${before.event?.title || 'your event'} was sent back: ${note}`,
        payload: { settlementId: after._id }
    });
    return res.json({ message: approve ? 'Settlement approved' : 'Settlement sent back to the host', code: 200, result: serializeSettlement(after) });
}

export const approve = (req, res) => review(req, res, true);
export const reject = (req, res) => review(req, res, false);
