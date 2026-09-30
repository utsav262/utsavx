import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Trash2, Minus, Plus, Ticket, ShieldCheck,
  ArrowRight, ShoppingBag, Calendar, MapPin, AlertCircle
} from 'lucide-react';
import { remove, updateQuantity } from '../store/index.js';
import { money } from '../lib/money.js';
import { formatDate } from '../lib/datetime.js';

export default function Cart() {
  const items = useSelector((state) => state.cart.items);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ---------- DERIVED ----------
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  // Buyers pay the ticket price only; this must match what the server charges.
  const total = subtotal;
  const totalTickets = items.reduce((sum, i) => sum + i.quantity, 0);

  // ---------- HANDLERS ----------
  const handleQty = (item, delta) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    if (next > 10) return;
    dispatch(updateQuantity({ id: item.id, quantity: next }));
  };

  const handleRemove = (id, title) => {
    if (window.confirm(`Remove "${title}" from cart?`)) {
      dispatch(remove(id));
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  // ---------- EMPTY STATE ----------
  if (!items.length) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
        <div className="border border-ink/10 bg-white px-8 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
            <ShoppingBag className="h-7 w-7 text-coral" />
          </div>
          <h1 className="serif mt-6 text-4xl">Your cart is empty</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">
            Let's find some great events to make
            your weekend memorable.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 bg-coral px-6 py-3 font-bold text-white hover:opacity-90"
            >
              Browse events <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3 font-bold hover:border-coral hover:text-coral"
            >
              Go home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---------- MAIN ----------
  return (
    <main className="bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">
              Your night out
            </p>
            <h1 className="serif mt-2 text-5xl leading-none sm:text-6xl">
              Your tickets
            </h1>
            <p className="mt-2 text-sm text-ink/55">
              {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'} ·{' '}
              {items.length} {items.length === 1 ? 'event' : 'events'}
            </p>
          </div>
          <Link
            to="/events"
            className="text-sm font-bold text-coral hover:underline"
          >
            + Add more events
          </Link>
        </div>

        {/* Layout */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* ---------- LEFT: ITEMS ---------- */}
          <div className="space-y-4">
            {items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onQty={handleQty}
                onRemove={handleRemove}
              />
            ))}

            {/* Info note */}
            <div className="flex items-start gap-3 border border-ink/10 bg-white p-4 text-xs text-ink/60">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
              <p>
                Tickets are held for 15 minutes. Complete checkout soon to
                secure your spot. Prices may change after that.
              </p>
            </div>
          </div>

          {/* ---------- RIGHT: SUMMARY (STICKY) ---------- */}
          <div>
            <div className="sticky top-24 space-y-4">
              {/* Order summary */}
              <div className="border border-ink/10 bg-white p-6">
                <h2 className="serif text-2xl">Order summary</h2>

                <div className="mt-5 space-y-2 text-sm">
                  <Row label={`Subtotal (${totalTickets} tickets)`} value={money(subtotal)} />
                  <Row label="Booking fee" value="None" />
                  <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-lg font-extrabold">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleCheckout}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-coral px-6 py-4 font-extrabold text-white transition hover:opacity-90"
                >
                  Continue to checkout
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Trust row */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink/50">
                  <ShieldCheck className="h-3.5 w-3.5 text-coral" />
                  Secure checkout · Instant delivery
                </div>
              </div>

              {/* Help card */}
              <div className="border border-ink/10 bg-white p-5 text-sm">
                <p className="font-bold">Need help?</p>
                <p className="mt-1 text-ink/60">
                  Trouble booking?{' '}
                  <Link to="/contact" className="font-bold text-coral hover:underline">
                    Contact support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- Cart Item ---------- */
function CartItem({ item, onQty, onRemove }) {
  const isMax = item.quantity >= 10;
  const isMin = item.quantity <= 1;
  const lineTotal = item.price * item.quantity;

  return (
    <div className="overflow-hidden border border-ink/10 bg-white">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        {/* Icon / Flyer placeholder */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-coral/10">
          <Ticket className="h-7 w-7 text-coral" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="serif text-2xl leading-tight">{item.title}</p>
              <p className="mt-1 text-sm text-ink/55">
                {item.ticketName || 'General Admission'}
              </p>
            </div>
            <button
              onClick={() => onRemove(item.id, item.title)}
              aria-label="Remove"
              className="p-2 text-ink/40 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Meta */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink/55">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {item.startsAt ? formatDate(item.startsAt) : 'Date TBA'}
            </span>
            {item.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.city}
              </span>
            )}
          </div>

          {/* Qty + Price row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center border border-ink/15">
              <button
                onClick={() => onQty(item, -1)}
                disabled={isMin}
                aria-label="Decrease"
                className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2ch] text-center text-sm font-bold">
                {item.quantity}
              </span>
              <button
                onClick={() => onQty(item, 1)}
                disabled={isMax}
                aria-label="Increase"
                className="flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-right">
              <p className="text-xs text-ink/50">
                {money(item.price)} × {item.quantity}
              </p>
              <p className="text-lg font-extrabold">{money(lineTotal)}</p>
            </div>
          </div>

          {isMax && (
            <p className="mt-2 text-xs text-amber-600">
              Max 10 tickets per order.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Summary Row ---------- */
function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={`font-bold ${accent || ''}`}>{value}</span>
    </div>
  );
}