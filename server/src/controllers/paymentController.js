import Stripe from 'stripe';
import BookingOrder from '../models/BookingOrder.js';
import { env } from '../config/env.js';
import { issueTickets } from '../services/ticketService.js';
import { success } from '../utils/response.js';

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

export async function createIntent(req, res) {
    if (!stripe) return res.status(503).json({ message: 'Online payments are not configured. Demo checkout completes in INR automatically.' });
    const order = await BookingOrder.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const intent = await stripe.paymentIntents.create(
        { amount: Math.round(order.total * 100), currency: (order.currency || 'INR').toLowerCase(), metadata: { orderId: order._id.toString() }, automatic_payment_methods: { enabled: true } },
        { idempotencyKey: order.idempotencyKey }
    );
    order.stripePaymentIntentId = intent.id;
    await order.save();
    res.json({ clientSecret: intent.client_secret, result: { clientSecret: intent.client_secret } });
}

export async function completeDemo(req, res) {
    if (!env.allowDemoPayments) {
        return res.status(403).json({ message: 'Demo checkout is disabled. Configure Stripe or set ALLOW_DEMO_PAYMENTS=true', code: 403 });
    }
    if (stripe) return res.status(400).json({ message: 'Use Stripe checkout in this environment', code: 400 });
    const order = await BookingOrder.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'paid') {
        order.status = 'paid';
        await order.save();
    }
    await issueTickets(order);
    const fresh = await BookingOrder.findById(order._id);
    return success(res, fresh, 'Order completed');
}

export async function webhook(req, res) {
    if (!stripe || !env.stripeWebhookSecret) return res.status(503).end();
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripeWebhookSecret);
    } catch {
        return res.status(400).send('Invalid signature');
    }
    if (event.type === 'payment_intent.succeeded') {
        const payment = event.data.object;
        const order = await BookingOrder.findOneAndUpdate(
            { stripePaymentIntentId: payment.id, status: { $ne: 'paid' } },
            { status: 'paid' },
            { new: true }
        );
        if (order) await issueTickets(order);
    }
    res.json({ received: true });
}

export async function legacyPaymentStatus(req, res) {
    const order = await BookingOrder.findOne({ stripePaymentIntentId: req.params.intentId, user: req.user._id }).lean();
    return success(res, null, order ? 'Order found' : 'Order not found', 200, { status: order?.status || 'pending', order_exists: Boolean(order) });
}
