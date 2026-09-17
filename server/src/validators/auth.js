import { z } from 'zod';

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/[0-9]/, 'Password must include a number');

export const registerSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    username: z.string().min(1).max(120).optional(),
    email: z.string().email().max(254),
    password: passwordSchema,
    role: z.enum(['customer', 'organizer']).optional()
}).refine((data) => Boolean(data.name || data.username), {
    message: 'Name is required',
    path: ['name']
});

export const loginSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128)
});
