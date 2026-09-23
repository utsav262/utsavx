import BookingOrder from '../models/BookingOrder.js';
import { releaseInventory } from '../services/inventoryService.js';

/**
 * Cancel pending orders whose checkout hold expired and return inventory.
 * Safe to run concurrently (claim via findOneAndUpdate).
 */
export async function expireStaleHolds({ limit = 100 } = {}) {
    const now = new Date();
    const candidates = await BookingOrder.find({
        status: 'pending',
        holdExpiresAt: { $lte: now, $ne: null }
    })
        .select('_id')
        .limit(limit)
        .lean();

    let released = 0;
    for (const row of candidates) {
        const order = await BookingOrder.findOneAndUpdate(
            {
                _id: row._id,
                status: 'pending',
                holdExpiresAt: { $lte: now }
            },
            { $set: { status: 'cancelled' }, $unset: { holdExpiresAt: 1 } },
            { new: true }
        );
        if (!order) continue;
        try {
            await releaseInventory(order.event, order.items);
            released += 1;
        } catch (error) {
            console.error('Failed to release inventory for expired hold', order._id, error.message);
        }
    }
    return released;
}

export function startHoldExpiryJob({ intervalMs = 30_000 } = {}) {
    let running = false;
    const tick = async () => {
        if (running) return;
        running = true;
        try {
            const count = await expireStaleHolds();
            if (count > 0) console.log(`Released inventory for ${count} expired hold(s)`);
        } catch (error) {
            console.error('Hold expiry job failed', error.message);
        } finally {
            running = false;
        }
    };

    const timer = setInterval(tick, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
    tick();
    return () => clearInterval(timer);
}
