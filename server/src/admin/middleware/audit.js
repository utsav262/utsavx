import AuditLog from '../../models/AuditLog.js';

/**
 * Record an admin write. Call from controllers with the before/after snapshot:
 *   await audit(req, { action: 'user.suspend', targetType: 'User', targetId, before, after });
 * Never throws — a logging failure must not break the action itself.
 */
export async function audit(req, { action, targetType, targetId, before, after, status = 'success', admin }) {
    const actor = admin || req.admin;
    try {
        await AuditLog.create({
            admin: actor?._id,
            adminEmail: actor?.email,
            action,
            targetType,
            targetId: targetId != null ? String(targetId) : undefined,
            before: redact(before),
            after: redact(after),
            ip: req.ip,
            userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
            status
        });
    } catch (error) {
        console.error('Audit log write failed', error.message);
    }
}

const SECRET_KEYS = /password|token|secret/i;
function redact(value) {
    if (!value || typeof value !== 'object') return value;
    const plain = JSON.parse(JSON.stringify(value));
    for (const key of Object.keys(plain)) {
        if (SECRET_KEYS.test(key)) plain[key] = '[redacted]';
    }
    return plain;
}
