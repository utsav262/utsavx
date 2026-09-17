import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clear } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { money } from '../lib/money.js';

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
                if (response.data.paymentRequired) {
                    setMessage('Online payment gateway is required for this order. Configure payments, or use demo mode without Stripe keys.');
                    return;
                }
            }
            dispatch(clear());
            navigate('/tickets');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Checkout could not be completed.');
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
                        Checkout is in Indian Rupees (₹). Without a payment gateway configured, UTSAVX completes a local demo checkout and issues tickets immediately.
                    </p>
                    {message && <p className="mt-5 border border-coral/30 bg-coral/10 p-4 text-sm">{message}</p>}
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="mt-8 w-full rounded-full bg-coral px-5 py-4 font-extrabold text-white disabled:opacity-60"
                    >
                        {busy ? 'Creating order…' : 'Pay with UPI / Card (demo)'}
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
