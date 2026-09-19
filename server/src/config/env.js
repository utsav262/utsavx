import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(serverRoot, '.env') });
dotenv.config({ path: path.join(serverRoot, '../.env') });

const isProduction = (process.env.NODE_ENV || 'development') === 'production';
const hasRazorpay = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const hasStripe = Boolean(process.env.STRIPE_SECRET_KEY);
const allowDemoPayments = process.env.ALLOW_DEMO_PAYMENTS === 'true'
    || (!isProduction && !hasRazorpay && !hasStripe);

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,
    port: Number(process.env.PORT || 5050),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    mongoUri: process.env.MONGO_URI,
    redisUrl: process.env.REDIS_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    hasRazorpay,
    hasStripe,
    allowDemoPayments
};

if (!env.mongoUri || !env.jwtSecret) {
    console.error('MONGO_URI and JWT_SECRET must be set. Copy server/.env.example to server/.env');
    process.exit(1);
}

if (env.jwtSecret.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters');
    process.exit(1);
}

if (isProduction) {
    const weakSecrets = ['replace-with-a-long-random-secret', 'utsavx-dev-secret-change-me-please-32chars', 'changeme', 'secret'];
    if (weakSecrets.includes(env.jwtSecret) || /^(password|test|dev)/i.test(env.jwtSecret)) {
        console.error('JWT_SECRET looks weak — set a unique random value in production');
        process.exit(1);
    }
    if (!process.env.CLIENT_URL) {
        console.error('CLIENT_URL must be set in production');
        process.exit(1);
    }
}
