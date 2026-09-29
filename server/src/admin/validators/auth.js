import { z } from 'zod';

export const adminLoginSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128)
});

export const dashboardQuerySchema = z.object({
    from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    refresh: z.enum(['0', '1']).optional()
});

export const settlementListSchema = z.object({
    status: z.enum(['all', 'pending', 'submitted', 'approved']).default('submitted'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const settlementReviewSchema = z.object({
    note: z.string().max(500).optional()
});
