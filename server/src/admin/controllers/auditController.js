import { z } from 'zod';
import AuditLog from '../../models/AuditLog.js';
import { containsRegex, listQuery, sendList } from '../services/listing.js';

export const auditQuery = listQuery({
    action: z.string().trim().max(60).optional(),
    target: z.string().trim().max(40).optional(),
    status: z.enum(['all', 'success', 'failure']).default('all'),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export async function list(req, res) {
    const { q, action, target, status, from, to } = req.validatedQuery;
    const filter = {};
    if (q) filter.$or = [{ adminEmail: containsRegex(q) }, { targetId: q }];
    if (action) filter.action = new RegExp(`^${action.replace(/[^a-z_.]/gi, '')}`, 'i');
    if (target) filter.targetType = target;
    if (status !== 'all') filter.status = status;
    if (from || to) filter.createdAt = { ...(from ? { $gte: new Date(`${from}T00:00:00Z`) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
    const actions = await AuditLog.distinct('action');
    return sendList(req, res, {
        model: AuditLog, filter, filename: 'audit-log', extra: { actions: actions.sort() },
        serialize: (l) => ({ _id: l._id, admin: l.adminEmail, action: l.action, target_type: l.targetType, target_id: l.targetId, before: l.before, after: l.after, ip: l.ip, user_agent: l.userAgent, status: l.status, created_at: l.createdAt }),
        columns: [
            { label: 'When', value: 'created_at' }, { label: 'Admin', value: 'admin' }, { label: 'Action', value: 'action' }, { label: 'Status', value: 'status' },
            { label: 'Target', value: (r) => `${r.target_type || ''} ${r.target_id || ''}`.trim() }, { label: 'Before', value: (r) => (r.before ? JSON.stringify(r.before) : '') },
            { label: 'After', value: (r) => (r.after ? JSON.stringify(r.after) : '') }, { label: 'IP', value: 'ip' }
        ]
    });
}
