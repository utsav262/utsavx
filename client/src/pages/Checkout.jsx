import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShieldCheck, Lock, CreditCard, Smartphone, Building2,
  ChevronLeft, Check, Clock, Copy, CheckCircle2, AlertCircle,
  Sparkles, Ticket, Info
} from 'lucide-react';
import { clear } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { money } from '../lib/money.js';
import { unwrap } from '../lib/unwrap.js';

/* ----------------------------- Razorpay helpers ---------------------------- */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
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
        contact: payment.prefill?.contact || '9999999999',
      },
      theme: { color: '#E85D4C' },
      config: { display: { preferences: { show_default_blocks: true } } },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (event) => {
      reject(new Error(event?.error?.description || 'Payment failed.'));
    });
    rzp.open();
  });
}

/* --------------------------------- Page ----------------------------------- */
export default function Checkout() {
  const items = useSelector((s) => s.cart.items);
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showTestInfo, setShowTestInfo] = useState(true);

  /* ---------- Derived ---------- */
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  // Buyers pay the ticket price only; this must match what the server charges.
  const total = subtotal;
  const totalTickets = items.reduce((sum, i) => sum + i.quantity, 0);


  /* ---------- Guards ---------- */
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!items.length) {
    return <Navigate to="/cart" replace />;
  }

  /* ---------- Submit ---------- */
  const submit = async () => {
    if (items.some((i) => !i.eventId || !i.ticketTypeId)) {
      setMessage(
        'These tickets are from the offline catalog. Open a live published event, then add tickets again.'
      );
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
        const fingerprint = group
          .map((i) => `${i.ticketTypeId}:${i.quantity}`)
          .sort()
          .join('|');
        const idemKey = `checkout:${user.id || user._id || user.email}:${eventId}:${fingerprint}`;

        const response = await apiClient.createOrder({
          eventId,
          items: group.map((i) => ({ ticketTypeId: i.ticketTypeId, quantity: i.quantity })),
          idempotencyKey: idemKey,
        });
        const order = unwrap(response, response.data?.order);
        const orderId = order?._id || order?.id;

        if (!response.data.paymentRequired) continue;
        if (!orderId) {
          setMessage('Order was created but payment could not start.');
          return;
        }

        const intentResponse = await apiClient.createIntent(orderId);
        const payment = unwrap(intentResponse, null);
        if (payment?.status === 'paid') continue;

        if (payment?.provider === 'razorpay') {
          const rzpResult = await openRazorpayCheckout(payment);
          await apiClient.verifyRazorpay({
            bookingOrderId: payment.bookingOrderId || orderId,
            razorpay_order_id: rzpResult.razorpay_order_id,
            razorpay_payment_id: rzpResult.razorpay_payment_id,
            razorpay_signature: rzpResult.razorpay_signature,
          });
          continue;
        }

        setMessage(
          'Online payments are unavailable right now. Please try again later or contact support.'
        );
        return;
      }

      dispatch(clear());
      navigate('/tickets');
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          'Checkout could not be completed.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-12">

        {/* ---------- Back link ---------- */}
        <Link
          to="/cart"
          className="inline-flex items-center gap-1 text-sm font-bold text-ink/60 hover:text-coral"
        >
          <ChevronLeft className="h-4 w-4" /> Back to cart
        </Link>

        {/* ---------- Header + steps ---------- */}
        <div className="mt-6">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">
            Secure checkout
          </p>
          <h1 className="serif mt-2 text-5xl leading-none sm:text-6xl">
            Almost there.
          </h1>
          <p className="mt-3 text-sm text-ink/60">
            One last step: complete payment and get your tickets instantly.
          </p>

          {/* Progress */}
          <div className="mt-6 flex items-center gap-2 text-xs font-bold">
            <Step done label="Cart" />
            <StepLine />
            <Step active label="Payment" />
            <StepLine />
            <Step label="Tickets" />
          </div>
        </div>

        {/* ---------- Layout ---------- */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">

          {/* ============ LEFT ============ */}
          <div className="space-y-6">

            {/* Hold notice: seats are only held once the order is created on Pay. */}
            <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              <span><span className="font-bold">Seats are held for 15 minutes</span> once you tap Pay, while you complete payment.</span>
            </div>

            {/* User card */}
            <div className="border border-ink/10 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="serif text-2xl">Contact details</h2>
                <Link to="/profile" className="text-xs font-bold text-coral hover:underline">Edit</Link>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-lg font-extrabold text-coral">
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold">{user.name || 'Guest'}</p>
                  <p className="truncate text-sm text-ink/55">{user.email}</p>
                </div>
                <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
              </div>
              <p className="mt-4 text-xs text-ink/45">
                Your tickets appear in My tickets right after payment.
              </p>
            </div>

            {/* Payment methods */}
            <div className="border border-ink/10 bg-white p-6">
              <h2 className="serif text-2xl">Payment method</h2>
              <p className="mt-1 text-sm text-ink/55">
                Pay securely with Razorpay — UPI, cards or netbanking.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <PayChip icon={<Smartphone className="h-4 w-4" />} label="UPI" />
                <PayChip icon={<CreditCard className="h-4 w-4" />} label="Cards" />
                <PayChip icon={<Building2 className="h-4 w-4" />} label="Netbanking" />
              </div>

              {/* Test-mode card: dev builds only, never on the live site */}
              {import.meta.env.DEV && (
              <div className="mt-5 overflow-hidden border border-dashed border-coral/40 bg-coral/5">
                <button
                  type="button"
                  onClick={() => setShowTestInfo((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-coral" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-coral">
                      Test mode credentials
                    </span>
                  </div>
                  <span className="text-xs font-bold text-coral">
                    {showTestInfo ? 'Hide' : 'Show'}
                  </span>
                </button>
                {showTestInfo && (
                  <div className="space-y-2 border-t border-coral/20 px-4 py-3 text-sm">
                    <TestRow label="UPI (easiest)" value="success@razorpay" />
                    <TestRow label="Card number" value="5267 3181 8797 5449" />
                    <TestRow label="CVV" value="123" />
                    <TestRow label="Expiry" value="12/28" />
                    <p className="pt-1 text-xs text-ink/50">
                      Note: Visa <code>4111…</code> is often blocked on test accounts
                      (treated as international).
                    </p>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Error */}
            {message && (
              <div className="flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-red-700">{message}</p>
              </div>
            )}

            {/* Trust row */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Trust icon={<ShieldCheck className="h-4 w-4" />} text="256-bit SSL" />
              <Trust icon={<Lock className="h-4 w-4" />} text="PCI-DSS compliant" />
              <Trust icon={<Ticket className="h-4 w-4" />} text="Instant delivery" />
            </div>
          </div>

          {/* ============ RIGHT: ORDER SUMMARY ============ */}
          <div>
            <div className="sticky top-24 space-y-4">
              <div className="overflow-hidden border border-ink/10 bg-white">
                <div className="bg-moss p-6 text-white">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-butter">
                    Order summary
                  </p>
                  <p className="serif mt-3 text-4xl leading-none">{money(total)}</p>
                  <p className="mt-2 text-xs text-white/70">
                    {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'} ·{' '}
                    {items.length} {items.length === 1 ? 'event' : 'events'}
                  </p>
                </div>

                <div className="space-y-3 p-6">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-bold leading-tight">{item.title}</p>
                        <p className="text-xs text-ink/55">
                          {item.ticketName || 'General'} · Qty {item.quantity}
                        </p>
                      </div>
                      <p className="shrink-0 font-bold">
                        {money(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}

                  <div className="space-y-2 border-t border-ink/10 pt-3 text-sm">
                    <div className="flex justify-between text-ink/60">
                      <span>Subtotal</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-ink/60">
                      <span>Booking fee</span>
                      <span>None</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-ink/10 pt-3 text-base font-extrabold">
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="group flex w-full items-center justify-center gap-2 bg-coral px-6 py-4 font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Pay {money(total)} securely
                  </>
                )}
              </button>

              <p className="text-center text-xs text-ink/45">
                By paying you agree to our{' '}
                <Link to="/terms" className="font-bold text-coral hover:underline">
                  Terms
                </Link>{' '}
                &{' '}
                <Link to="/refunds" className="font-bold text-coral hover:underline">
                  Refund Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* --------------------------- Small components --------------------------- */
function Step({ label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-extrabold ${
          done
            ? 'bg-green-600 text-white'
            : active
            ? 'bg-coral text-white'
            : 'bg-ink/10 text-ink/50'
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : ''}
      </span>
      <span
        className={
          active
            ? 'text-ink'
            : done
            ? 'text-ink/70'
            : 'text-ink/40'
        }
      >
        {label}
      </span>
    </div>
  );
}

function StepLine() {
  return <span className="h-px w-6 bg-ink/15" />;
}

function PayChip({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5 border border-ink/15 bg-cream/50 px-3 py-3 text-xs font-bold text-ink/70">
      <span className="text-coral">{icon}</span>
      {label}
    </div>
  );
}

function TestRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink/55">{label}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 bg-white px-2 py-1 font-mono text-xs font-bold text-ink hover:bg-coral/10"
      >
        {value}
        {copied ? (
          <Check className="h-3 w-3 text-green-600" />
        ) : (
          <Copy className="h-3 w-3 text-ink/40" />
        )}
      </button>
    </div>
  );
}

function Trust({ icon, text }) {
  return (
    <div className="flex items-center gap-2 border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink/70">
      <span className="text-coral">{icon}</span>
      {text}
    </div>
  );
}