import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CalendarDays, MapPin, Share2, Heart, Clock,
  Users, ShieldCheck, ChevronLeft, Info
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { add } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { money } from '../lib/money.js';
import { formatDate } from '../lib/datetime.js';
import { canPurchase } from '../lib/roles.js';
import { admitsNote, admitsOf } from '../lib/admits.js';
import EventCard from '../components/events/EventCard.jsx';
import { EVENT_PLACEHOLDER } from '../lib/placeholder.js';

const PLACEHOLDER = EVENT_PLACEHOLDER;

export default function EventDetail() {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);
  const isBuyer = canPurchase(user);

  const [event, setEvent] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [adding, setAdding] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(null); setEvent(null); setRelated([]);
    setTicketTypeId(''); setQuantity(1);

    (async () => {
      try {
        const res = await apiClient.event(id, { signal: controller.signal });
        const result = unwrap(res, null);
        if (!active) return;
        if (!result || Array.isArray(result)) { setError('not_found'); return; }
        setEvent(result);
        const tickets = result.tickets || result.ticketTypes || [];
        setTicketTypeId(tickets[0]?._id || tickets[0]?.id || '');
        const eid = result._id || result.id;
        if (eid) {
          apiClient.relatedEvents(eid, { signal: controller.signal })
            .then((r) => active && setRelated(unwrap(r, []) || []))
            .catch(() => active && setRelated([]));
        }
      } catch (err) {
        if (active && err.name !== 'AbortError') setError('fetch_failed');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; controller.abort(); };
  }, [id]);

  const tickets = event?.tickets || event?.ticketTypes || [];
  const selected = useMemo(
    () => tickets.find((t) => String(t._id || t.id) === String(ticketTypeId)) || tickets[0],
    [tickets, ticketTypeId]
  );

  const price = selected?.price ?? event?.price ?? 0;
  const stock = selected?.quantity_left ?? selected?.quantity ?? null;
  const isSoldOut = stock !== null && stock <= 0;
  const isPast = event?.startsAt ? new Date(event.startsAt) < new Date() : false;
  const maxQty = stock !== null ? Math.min(stock, 10) : 10;
  const canBuy = isBuyer && !isSoldOut && !isPast && selected;

  // Buyers pay the ticket price only (fees come out of the host's share), matching the server's order total.
  const total = price * quantity;

  const handleAddToCart = () => {
    if (!canBuy || adding) return;
    if (!token) return navigate('/login', { state: { from: location.pathname } });
    setAdding(true);
    dispatch(add({
      id: `${event._id || event.id || event.slug}-${selected._id || selected.id || 'ga'}`,
      title: event.title || event.name,
      price, quantity,
      eventId: event._id || event.id,
      ticketTypeId: selected._id || selected.id,
      ticketName: selected?.name || 'General Admission',
      admits: admitsOf(selected),
    }));
    navigate('/cart');
  };

  // ---------- LOADING / ERROR ----------
  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-20">
        <div className="animate-pulse space-y-6">
          <div className="aspect-[21/9] w-full bg-ink/10" />
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div className="h-10 w-2/3 bg-ink/10" />
              <div className="h-4 w-full bg-ink/10" />
              <div className="h-4 w-5/6 bg-ink/10" />
            </div>
            <div className="h-80 bg-ink/10" />
          </div>
        </div>
      </main>
    );
  }

  if (error === 'not_found' || (!event && !loading)) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-24 text-center">
        <h1 className="serif text-5xl">Event not found</h1>
        <p className="mt-3 text-ink/55">This event doesn't exist or has been removed.</p>
        <Link to="/events" className="mt-6 inline-block bg-coral px-6 py-3 font-bold text-white">
          Browse events
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-24 text-center">
        <h1 className="serif text-5xl">Something went wrong</h1>
        <button onClick={() => window.location.reload()} className="mt-6 bg-coral px-6 py-3 font-bold text-white">
          Retry
        </button>
      </main>
    );
  }

  const title = event.title || event.name;
  const cover = event.cover_image || event.image || event.imageUrl || event.horizontal_flyer || PLACEHOLDER;
  const city = event.city || event.venue?.city || 'Location TBA';
  const startDate = formatDate(event.startsAt || event.date);

  return (
    <main className="bg-cream pb-20 lg:pb-0">
      {/* ================= HERO ================= */}
      <section className="relative">
        <div className="relative h-[55vh] min-h-[400px] w-full overflow-hidden">
          <img
            src={cover}
            onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute left-5 top-5 flex items-center gap-2 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur-md hover:bg-white/25"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {/* Top-right actions */}
          <div className="absolute right-5 top-5 flex gap-2">
            <button
              onClick={() => setWishlisted((w) => !w)}
              aria-label="Wishlist"
              className="bg-white/15 p-3 text-white backdrop-blur-md hover:bg-white/25"
            >
              <Heart className={`h-4 w-4 ${wishlisted ? 'fill-coral text-coral' : ''}`} />
            </button>
            <button
              onClick={() => navigator.share?.({ title, url: window.location.href })}
              aria-label="Share"
              className="bg-white/15 p-3 text-white backdrop-blur-md hover:bg-white/25"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-8 lg:px-10 lg:pb-12">
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <span className="bg-coral px-3 py-1 text-white">
                  {isPast ? 'Ended' : isSoldOut ? 'Sold out' : 'Live'}
                </span>
                <span className="bg-white/15 px-3 py-1 text-white backdrop-blur-md">
                  {city}
                </span>
              </div>
              <h1 className="serif mt-4 max-w-4xl text-5xl leading-[1] text-white sm:text-7xl lg:text-8xl">
                {title}
              </h1>
              {event.host && (
                <p className="mt-3 text-sm text-white/80">
                  Hosted by <b className="text-white">{event.host.name || event.host.username}</b>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= BODY ================= */}
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-14">

          {/* ---------- LEFT COLUMN ---------- */}
          <div className="space-y-10">

            {/* Quick facts bar */}
            <div className="grid grid-cols-2 gap-4 border border-ink/10 bg-white p-5 sm:grid-cols-3">
              <Fact icon={<CalendarDays className="h-5 w-5 text-coral" />} label="Date" value={startDate || 'TBA'} />
              <Fact icon={<Clock className="h-5 w-5 text-coral" />} label="Time" value={event.startsAt ? new Date(event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'} />
              <Fact icon={<MapPin className="h-5 w-5 text-coral" />} label="Venue" value={event.venue?.name || city} />
            </div>

            {/* About */}
            <div>
              <h2 className="serif text-3xl">About this event</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-ink/70">
                {event.description || 'No description provided.'}
              </p>
            </div>

            {/* Gallery */}
            {(event.flyer1 || event.flyer2) && (
              <div>
                <h2 className="serif text-3xl">Gallery</h2>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {event.flyer1 && (
                    <img src={event.flyer1} alt="Flyer 1" className="aspect-[4/3] w-full object-cover" />
                  )}
                  {event.flyer2 && (
                    <img src={event.flyer2} alt="Flyer 2" className="aspect-[4/3] w-full object-cover" />
                  )}
                </div>
              </div>
            )}

            {/* Lineup / Guests */}
            {event.guests?.length > 0 && (
              <div>
                <h2 className="serif text-3xl">Lineup</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {event.guests.map((g) => (
                    <div key={g._id || g.email} className="flex items-center gap-3 border border-ink/10 bg-white py-2 pl-2 pr-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-coral/15 text-sm font-bold text-coral">
                        {(g.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold">{g.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info / Terms */}
            <div className="border border-ink/10 bg-white p-6">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-coral" />
                <h3 className="font-bold">Good to know</h3>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink/70">
                <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-coral" /> Entry allowed with valid ID + ticket</li>
                <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-coral" /> {stock !== null ? `${stock} tickets left` : 'Limited tickets'}</li>
                <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-coral" /> Gates open 1 hour before start</li>
              </ul>
            </div>
          </div>

          {/* ---------- RIGHT COLUMN (STICKY BUY BOX) ---------- */}
          <div id="tickets" className="scroll-mt-20">
            <div className="sticky top-24 space-y-4 border border-ink/10 bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">Tickets</p>
                <p className="mt-1 text-3xl font-extrabold">
                  {money(price)}{' '}
                  <span className="text-sm font-medium text-ink/50">
                    {admitsOf(selected) > 1 ? `/ ${admitsOf(selected)} people` : '/ person'}
                  </span>
                </p>
              </div>

              {/* Ticket type */}
              {tickets.length > 1 ? (
                <select
                  value={ticketTypeId}
                  onChange={(e) => { setTicketTypeId(e.target.value); setQuantity(1); }}
                  className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm"
                  aria-label="Select ticket type"
                >
                  {tickets.map((t) => {
                    const left = t.quantity_left ?? t.quantity;
                    const soldOut = left !== undefined && left <= 0;
                    return (
                      <option key={t._id || t.id} value={t._id || t.id} disabled={soldOut}>
                        {t.name} · {money(t.price)}
                        {admitsOf(t) > 1 ? ` · admits ${admitsOf(t)}` : ''}
                        {left !== undefined ? (soldOut ? ' · Sold out' : ` · ${left} left`) : ''}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <p className="bg-ink/5 px-4 py-3 text-sm font-bold">
                  {selected?.name || 'General Admission'}
                </p>
              )}
              {admitsNote(selected) ? (
                <p className="flex items-center gap-2 bg-coral/10 px-4 py-2.5 text-sm font-bold text-coral">
                  <Users className="h-4 w-4" /> {admitsNote(selected)} · one QR per ticket
                </p>
              ) : null}

              {/* Qty */}
              <div className="flex items-center justify-between border border-ink/20 px-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || !canBuy}
                  className="px-4 py-3 text-lg disabled:opacity-40"
                  aria-label="Decrease"
                >−</button>
                <span className="font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty || !canBuy}
                  className="px-4 py-3 text-lg disabled:opacity-40"
                  aria-label="Increase"
                >+</button>
              </div>

              {/* Fee breakdown */}
              {canBuy && (
                <div className="flex justify-between bg-ink/5 px-3 py-2.5 text-sm font-bold">
                  <span>Total · no booking fee</span><span>{money(total)}</span>
                </div>
              )}

              {/* CTA */}
              {!isBuyer ? (
                <p className="bg-ink/5 px-4 py-4 text-center text-sm font-bold text-ink/60">
                  {user?.role === 'admin'
                    ? 'Admins can’t buy tickets.'
                    : 'Managers can’t buy tickets — sell them from your Dashboard.'}
                </p>
              ) : (
              <button
                onClick={handleAddToCart}
                disabled={!canBuy || adding}
                className="w-full bg-coral px-6 py-4 font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPast ? 'Event ended' : isSoldOut ? 'Sold out' : adding ? 'Adding…' : token ? 'Get tickets' : 'Sign in to buy'}
              </button>
              )}

              <p className="text-center text-xs text-ink/45">
                Secure checkout · Instant confirmation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= RELATED ================= */}
      {related.length > 0 && (
        <section className="border-t border-ink/10 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-10">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">More like this</p>
            <h2 className="serif mt-2 text-4xl">Related events</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.slice(0, 4).map((item) => (
                <EventCard key={item.slug || item._id} event={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= MOBILE BUY BAR ================= */}
      {isBuyer && !isPast && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-ink/10 bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] lg:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">{isSoldOut ? 'Sold out' : 'From'}</p>
            <p className="text-lg font-extrabold leading-tight">{money(price)}</p>
          </div>
          <a
            href="#tickets"
            className={`shrink-0 px-6 py-3 text-sm font-extrabold text-white ${isSoldOut ? 'pointer-events-none bg-ink/30' : 'bg-coral'}`}
          >
            {isSoldOut ? 'Sold out' : 'Get tickets'}
          </a>
        </div>
      )}
    </main>
  );
}

/* ---------- Small helper component ---------- */
function Fact({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-ink/45">{label}</p>
        <p className="mt-0.5 text-sm font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}