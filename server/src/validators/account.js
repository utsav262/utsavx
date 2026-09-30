import { z } from 'zod';

export const profileSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    phone: z.string().trim().max(20)
        .refine((v) => !v || /^\+?[0-9 -]{7,20}$/.test(v), 'Enter a valid phone number')
        .optional()
});

export const passwordSchema = z.object({
    current_password: z.string().min(1, 'Enter your current password').max(128),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128)
        .regex(/[A-Za-z]/, 'Password must include a letter')
        .regex(/[0-9]/, 'Password must include a number')
});

export const payoutBankSchema = z.object({
    account_holder_name: z.string().trim().min(2, 'Name on account is required').max(120),
    bank_name: z.string().trim().min(2, 'Bank name is required').max(120),
    branch: z.string().trim().max(120).optional().default(''),
    /** Omit to keep the saved number (the API only ever returns it masked). */
    account_number: z.string().trim().regex(/^\d{9,18}$/, 'Account number must be 9–18 digits').optional(),
    ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid 11-character IFSC code'),
    account_type: z.enum(['savings', 'current'], { errorMap: () => ({ message: 'Choose savings or current' }) }),
    upi_id: z.string().trim().max(80)
        .refine((v) => !v || /^[\w.-]{2,}@[A-Za-z]{2,}$/.test(v), 'Enter a valid UPI ID')
        .optional().default('')
});
