import { z } from 'zod';

/** Shared list query: page/limit/search/sort + ?format=csv. Modules extend it with their own filters. */
export const listQuery = (extra = {}) => z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    format: z.enum(['json', 'csv']).default('json'),
    ...extra
});

export const CSV_MAX_ROWS = 10000;

/** Escape a value for regex search (user input → literal match). */
export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const containsRegex = (value) => new RegExp(escapeRegex(value), 'i');

function csvCell(value) {
    if (value == null) return '';
    let text = value instanceof Date ? value.toISOString() : String(value);
    // Neutralise spreadsheet formula injection.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows, columns) {
    const header = columns.map((c) => csvCell(c.label)).join(',');
    const body = rows.map((row) => columns.map((c) => csvCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','));
    return [header, ...body].join('\r\n');
}

/**
 * Run a paged Mongoose query, or stream CSV when format=csv.
 *   await sendList(req, res, { model, filter, sort, populate, select, serialize, columns, filename })
 */
export async function sendList(req, res, { model, filter = {}, sort = { createdAt: -1 }, populate = [], select, serialize = (r) => r, columns, filename, extra = {} }) {
    const { page, limit, format } = req.validatedQuery;
    const build = (q) => {
        populate.forEach((p) => { q = q.populate(p); });
        if (select) q = q.select(select);
        return q.sort(sort).lean();
    };

    if (format === 'csv') {
        const rows = await build(model.find(filter).limit(CSV_MAX_ROWS));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(`﻿${toCsv(rows.map(serialize), columns)}`);
    }

    const [rows, total] = await Promise.all([
        build(model.find(filter).skip((page - 1) * limit).limit(limit)),
        model.countDocuments(filter)
    ]);
    return res.json({
        message: 'OK',
        code: 200,
        result: rows.map(serialize),
        pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
        ...extra
    });
}

export const fail = (res, code, message, errors) => res.status(code).json({ message, code, ...(errors ? { errors } : {}) });

/** Parse a body with zod → value or send 422. */
export function parseBody(schema, req, res) {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
        fail(res, 422, 'Validation failed', parsed.error.flatten().fieldErrors);
        return null;
    }
    return parsed.data;
}
