import Redis from 'ioredis';
import { env } from './env.js';

let client = null;
let ready = false;
let connectPromise = null;

/**
 * Shared Redis client for rate limiting, cache, and future queues.
 * Returns null when REDIS_URL is unset or Redis is unreachable.
 */
export function getRedis() {
    return ready ? client : null;
}

export function isRedisReady() {
    return ready && Boolean(client);
}

export async function connectRedis() {
    if (!env.redisUrl) return null;
    if (ready && client) return client;
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
        const redis = new Redis(env.redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy: () => null
        });

        redis.on('error', () => {
            /* connection errors are handled at connect time / command time */
        });

        try {
            await redis.connect();
            await redis.ping();
            client = redis;
            ready = true;
            console.log('Redis connected');
            return client;
        } catch {
            ready = false;
            client = null;
            try { redis.disconnect(); } catch { /* ignore */ }
            console.warn('Redis unavailable — cache and distributed rate limits disabled');
            return null;
        } finally {
            connectPromise = null;
        }
    })();

    return connectPromise;
}

export async function disconnectRedis() {
    ready = false;
    if (!client) return;
    const current = client;
    client = null;
    try { await current.quit(); } catch {
        try { current.disconnect(); } catch { /* ignore */ }
    }
}
