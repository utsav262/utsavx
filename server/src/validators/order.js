import { z } from 'zod';

export const orderSchema = z.object({
    eventId: z.string().min(1),
    idempotencyKey: z.string().min(1),
    items: z.array(z.object({
        ticketTypeId: z.string().min(1),
        quantity: z.number().int().min(1).max(20)
    })).min(1)
});
