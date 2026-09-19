import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import BookingOrder from '../models/BookingOrder.js';
import { env } from '../config/env.js';
import { issueTickets } from '../services/ticketService.js';
import { success } from '../utils/response.js';

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
const razorpay = env.hasRazorpay
    ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
    : null;

function amountInPaise(order) {
    return Math.round(Number(order.total || 0) * 100);
}

/** Create Razorpay order (preferred) or Stripe PaymentIntent. */
export async function createIntent(req, res) {
    const order = await BookingOrder.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found', code: 404 });
    if (order.status === 'paid') {
        return success(res, { status: 'paid', orderId: order._id }, 'Order already paid');
    }

    if (razorpay) {
        const amount = amountInPaise(order);
        if (amount <= 0) {
            order.status = 'paid';
            await order.save();
            await issueTickets(order);
            return success(res, { status: 'paid', orderId: order._id }, 'Free order completed');
        }

        const rpOrder = await razorpay.orders.create({
            amount,
            currency: (order.currency || 'INR').toUpperCase(),
            receipt: String(order.orderNumber || order._id).slice(0, 40),
            notes: {
                bookingOrderId: String(order._id),
                userId: String(req.user._id)
            }
        });

        order.paymentIntentId = rpOrder.id;
        await order.save();

        return success(res, {
            provider: 'razorpay',
            keyId: env.razorpayKeyId,
            testMode: String(env.razorpayKeyId || '').startsWith('rzp_test_'),
            razorpayOrderId: rpOrder.id,
            amount: rpOrder.amount,
            currency: rpOrder.currency,
            bookingOrderId: order._id,
            orderNumber: order.orderNumber,
            name: req.user.name || '',
            email: req.user.email || '',
            prefill: {
                name: req.user.name || '',
                email: req.user.email || '',
                contact: '9999999999'
            }
        }, 'Razorpay order created');
    }

    if (!stripe) {
        return res.status(503).json({
            message: 'Online payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
            code: 503
        });
    }

    const intent = await stripe.paymentIntents.create(
        {
            amount: amountInPaise(order),
            currency: (order.currency || 'INR').toLowerCase(),
            metadata: { orderId: order._id.toString() },
            automatic_payment_methods: { enabled: true }
        },
        { idempotencyKey: order.idempotencyKey }
    );
    order.paymentIntentId = intent.id;
    await order.save();
    return success(res, {
        provider: 'stripe',
        clientSecret: intent.client_secret
    }, 'Stripe intent created');
}

/** Verify Razorpay checkout signature and issue tickets. */
export async function verifyRazorpay(req, res) {
    if (!env.hasRazorpay) {
        return res.status(503).json({ message: 'Razorpay is not configured', code: 503 });
    }

    const {
        bookingOrderId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
    } = req.body || {};

    if (!bookingOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(422).json({ message: 'Missing Razorpay payment fields', code: 422 });
    }

    const order = await BookingOrder.findOne({ _id: bookingOrderId, user: req.user._id });
    if (!order) return res.status(404).json({ message: 'Order not found', code: 404 });

    if (order.status === 'paid') {
        return success(res, order, 'Order already paid');
    }

    if (order.paymentIntentId && order.paymentIntentId !== razorpayOrderId) {
        return res.status(400).json({ message: 'Razorpay order mismatch', code: 400 });
    }

    const expected = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

    const valid = expected.length === razorpaySignature.length
        && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));

    if (!valid) {
        return res.status(400).json({ message: 'Invalid payment signature', code: 400 });
    }

    order.status = 'paid';
    order.paymentIntentId = razorpayPaymentId;
    await order.save();
    await issueTickets(order);
    const fresh = await BookingOrder.findById(order._id).populate('event', 'title startsAt venue imageUrl');
    return success(res, fresh, 'Payment verified');
}

export async function completeDemo(req, res) {
    if (!env.allowDemoPayments) {
        return res.status(403).json({
            message: 'Demo checkout is disabled. Configure Razorpay or set ALLOW_DEMO_PAYMENTS=true',
            code: 403
        });
    }
    if (razorpay || stripe) {
        return res.status(400).json({ message: 'Use Razorpay / Stripe checkout in this environment', code: 400 });
    }
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
    // Stripe webhook (legacy). Razorpay uses verify endpoint after Checkout.
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
            { paymentIntentId: payment.id, status: { $ne: 'paid' } },
            { status: 'paid' },
            { new: true }
        );
        if (order) await issueTickets(order);
    }
    res.json({ received: true });
}

export async function legacyPaymentStatus(req, res) {
    const order = await BookingOrder.findOne({
        $or: [
            { paymentIntentId: req.params.intentId },
            { _id: req.params.intentId }
        ],
        user: req.user._id
    }).lean();
    return success(res, null, order ? 'Order found' : 'Order not found', 200, {
        status: order?.status || 'pending',
        order_exists: Boolean(order)
    });
}
