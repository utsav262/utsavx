import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clear } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { money } from '../lib/money.js';
import { unwrap } from '../lib/unwrap.js';

function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function openRazorpayCheckout(payment) {
    return new Promise(async (resolve, reject) => {
        const ready = await loadRazorpayScript();
        if (!ready || !window.Razorpay) {
            reject(new Error('Could not load Razorpay Checkout.'));
            return;
        }

        const options = {
            key: payment.keyId,
            amount: payment.amount,
            currency: payment.currency || 'INR',
            name: 'UTSAVX',
            description: `Order ${payment.orderNumber || ''}`.trim(),
            order_id: payment.razorpayOrderId,
            prefill: {
                name: payment.prefill?.name || payment.name || '',
                email: payment.prefill?.email || payment.email || '',
                contact: payment.prefill?.contact || '9999999999'
            },
            theme: { color: '#E85D4C' },
            // Prefer Indian methods; international cards are often disabled on test accounts.
            config: {
                display: {
                    preferences: {
                        show_default_blocks: true
                    }
                }
            },
            handler: (response) => resolve(response),
            modal: {
                ondismiss: () => reject(new Error('Payment cancelled.'))
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (event) => {
            reject(new Error(event?.error?.description || 'Payment failed.'));
        });
        rzp.open();
    });
}

export default function Checkout() {
    const items = useSelector((state) => state.cart.items);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector((state) => state.auth.user);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    const submit = async () => {
        if (!items.length) return navigate('/cart');
        if (items.some((item) => !item.eventId || !item.ticketTypeId)) {
            setMessage('These tickets are from the offline catalog. Open a live published event, then add tickets again.');
            return;
        }
        setBusy(true);
        setMessage('');
        try {
            const groups = new Map();
            for (const item of items) {
                const group = groups.get(item.eventId) || [];
                group.push(item);
                groups.set(item.eventId, group);
            }

            for (const [eventId, group] of groups) {
                const response = await apiClient.createOrder({
                    eventId,
                    items: group.map((item) => ({ ticketTypeId: item.ticketTypeId, quantity: item.quantity })),
                    idempotencyKey: crypto.randomUUID()
                });
                const order = unwrap(response, response.data?.order);
                const orderId = order?._id || order?.id;

                if (!response.data.paymentRequired) {
                    continue;
                }

                if (!orderId) {
                    setMessage('Order was created but payment could not start.');
                    return;
                }

                const intentResponse = await apiClient.createIntent(orderId);
                const payment = unwrap(intentResponse, null);

                if (payment?.status === 'paid') {
                    continue;
                }

                if (payment?.provider === 'razorpay') {
                    const rzpResult = await openRazorpayCheckout(payment);
                    await apiClient.verifyRazorpay({
                        bookingOrderId: payment.bookingOrderId || orderId,
                        razorpay_order_id: rzpResult.razorpay_order_id,
                        razorpay_payment_id: rzpResult.razorpay_payment_id,
                        razorpay_signature: rzpResult.razorpay_signature
                    });
                    continue;
                }

                setMessage(
                    'Online payment gateway is required. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to server/.env, then restart the API.'
                );
                return;
            }

            dispatch(clear());
            navigate('/tickets');
        } catch (error) {
            setMessage(error.response?.data?.message || error.message || 'Checkout could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    if (!items.length) return <Navigate to="/cart" replace />;

    return (
        <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Secure checkout</p>
            <h1 className="serif mt-3 text-6xl">Almost there.</h1>
            <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_.8fr]">
                <div>
                    <p className="leading-7 text-ink/65">
                        Pay securely with Razorpay (UPI, cards, netbanking). Tickets are issued right after payment
                        succeeds.
                    </p>
                    <div className="mt-5 border border-ink/10 bg-cream p-4 text-sm text-ink/70">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-coral">Test mode</p>
                        <p className="mt-2">
                            Use <b>UPI</b> <code className="text-ink">success@razorpay</code> (easiest), or domestic card{' '}
                            <code className="text-ink">5267 3181 8797 5449</code> · CVV <code className="text-ink">123</code> ·
                            expiry <code className="text-ink">12/28</code>.
                        </p>
                        <p className="mt-2 text-ink/50">
                            Visa <code>4111…</code> is often treated as international and blocked on many test accounts.
                        </p>
                    </div>
                    {message ? <p className="mt-5 border border-coral/30 bg-coral/10 p-4 text-sm">{message}</p> : null}
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="mt-8 w-full rounded-full bg-coral px-5 py-4 font-extrabold text-white disabled:opacity-60"
                    >
                        {busy ? 'Processing…' : `Pay ${money(total)} with Razorpay`}
                    </button>
                </div>
                <div className="bg-moss p-7 text-white">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-butter">Order summary</p>
                    <p className="serif mt-4 text-3xl">{money(total)}</p>
                    <ul className="mt-5 space-y-2 text-sm text-white/80">
                        {items.map((item) => (
                            <li key={item.id}>
                                {item.quantity} × {item.title}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    );
}
