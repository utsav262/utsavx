import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import eventRoutes, { getCategories, getCities, getCountryList } from './routes/events.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import managerRoutes from './routes/manager.js';
import { notFound, errorHandler } from './middleware/error.js';
import { webhook } from './controllers/paymentController.js';
import { seedIfEmpty } from './scripts/seed.js';
import { asyncHandler } from './middleware/asyncHandler.js';

const app = express();
let limiter = (req, res, next) => next();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), webhook);
app.post('/api/v1/payment/webhook/stripe', express.raw({ type: 'application/json' }), webhook);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => limiter(req, res, next));
app.get('/health', (req, res) => res.json({ ok: true, service: 'utsavx-api' }));
app.use('/api/v1/auth', authRoutes);
app.get('/api/v1/getCountryList', asyncHandler(getCountryList));
app.get('/api/v1/getCities/:country', asyncHandler(getCities));
app.get('/api/v1/getCategories', asyncHandler(getCategories));
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/manager', managerRoutes);
app.use('/api/v1/event', eventRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1', orderRoutes);
app.use(notFound);
app.use(errorHandler);

async function configureRateLimiter() {
    const options = { windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false };
    if (env.redisUrl) {
        const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
        try {
            await redis.connect();
            options.store = new RedisStore({ sendCommand: (...args) => redis.call(...args) });
            console.log('Rate limiter using Redis');
        } catch {
            console.warn('Redis unavailable, using in-memory rate limiter');
            try { redis.disconnect(); } catch { /* ignore */ }
        }
    }
    limiter = rateLimit(options);
}

async function start() {
    await mongoose.connect(env.mongoUri);
    if (env.nodeEnv !== 'production') await seedIfEmpty();
    await configureRateLimiter();
    app.listen(env.port, () => console.log(`UTSAVX API listening on ${env.port}`));
}

start().catch((error) => {
    console.error('Unable to start API', error);
    process.exit(1);
});
