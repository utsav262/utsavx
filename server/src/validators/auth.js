import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    username: z.string().min(1).max(120).optional(),
    email: z.string().email(),
    password: z.string().min(6).max(128),
    role: z.enum(['customer', 'organizer']).optional()
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});
