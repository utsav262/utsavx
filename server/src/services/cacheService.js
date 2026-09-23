import crypto from 'node:crypto';
import { getRedis } from '../config/redis.js';

const CATALOG_GEN_KEY = 'cache:catalog:gen';

function stableHash(value) {
    return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

export async function catalogGeneration() {
    const redis = getRedis();
    if (!redis) return '0';
    try {
        return String((await redis.get(CATALOG_GEN_KEY)) || '0');
    } catch {
        return '0';
    }
}

export function listCacheKey(prefix, query) {
    return `${prefix}:${stableHash(query || {})}`;
}

export async function cacheGet(key) {
    const redis = getRedis();
    if (!redis) return null;
    try {
        const raw = await redis.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export async function cacheSet(key, value, ttlSeconds) {
    const redis = getRedis();
    if (!redis || !ttlSeconds) return;
    try {
        await redis.set(key, JSON.stringify(value), 'EX', Math.max(1, Math.floor(ttlSeconds)));
    } catch {
        /* ignore cache write failures */
    }
}

/** Bump catalog generation so list caches miss without SCAN deletes. */
export async function invalidateCatalogCache() {
    const redis = getRedis();
    if (!redis) return;
    try {
        await redis.incr(CATALOG_GEN_KEY);
    } catch {
        /* ignore */
    }
}

export async function invalidateEventDetailCache({ id, slug } = {}) {
    const redis = getRedis();
    if (!redis) return;
    const keys = [];
    if (id) keys.push(`cache:event:detail:id:${id}`);
    if (slug) keys.push(`cache:event:detail:slug:${slug}`);
    if (!keys.length) return;
    try {
        await redis.del(...keys);
    } catch {
        /* ignore */
    }
}

/** Call after any public-facing event mutation (publish, edit, feature, cancel). */
export async function invalidateEventCaches(event) {
    await Promise.all([
        invalidateCatalogCache(),
        invalidateEventDetailCache({
            id: event?._id || event?.id,
            slug: event?.slug
        })
    ]);
}
