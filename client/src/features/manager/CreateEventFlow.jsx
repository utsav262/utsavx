import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import TicketFlow from '../tickets/TicketFlow.jsx';
import { isNonComplimentary, ticketFromApi } from '../tickets/ticketUtils.js';
import WizardProgress from './create/WizardProgress.jsx';
import LivePreview from './create/LivePreview.jsx';
import StepBasics from './create/StepBasics.jsx';
import StepMedia from './create/StepMedia.jsx';
import StepTickets from './create/StepTickets.jsx';
import StepPeople from './create/StepPeople.jsx';
import StepCoupons from './create/StepCoupons.jsx';
import StepReview from './create/StepReview.jsx';

const STEPS = [
  { id: 'basics', label: 'Basics', hint: 'Name, when, where' },
  { id: 'media', label: 'Look', hint: 'Cover & gallery' },
  { id: 'tickets', label: 'Tickets', hint: 'Pricing & capacity' },
  { id: 'people', label: 'People', hint: 'Guests & team' },
  { id: 'coupons', label: 'Offers', hint: 'Promo codes' },
  { id: 'review', label: 'Review', hint: 'Submit or save' },
];

const emptyBasics = {
  title: '',
  description: '',
  category: 'Music',
  startsAt: '',
  endsAt: '',
  venue: { name: '', address: '', city: '', country: 'India' },
  featured: false,
};

function toLocalDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function CreateEventFlow({ reload, notice, onCreated, onCancel, eventId: seedEventId }) {
  const user = useSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'admin';

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [eventId, setEventId] = useState(seedEventId || null);
  const [basics, setBasics] = useState(emptyBasics);
  const [imageUrl, setImageUrl] = useState('');
  const [extraImages, setExtraImages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketFlowOpen, setTicketFlowOpen] = useState(false);
  const [guests, setGuests] = useState([]);
  const [handlers, setHandlers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [hydrating, setHydrating] = useState(Boolean(seedEventId));
  const [errors, setErrors] = useState({});

  /* ---------- derived ---------- */
  const capacity = useMemo(
    () => tickets.reduce((s, t) => s + Math.max(0, Number(t.quantity || 0)), 0),
    [tickets]
  );
  const minPrice = useMemo(() => {
    const prices = tickets
      .filter(isNonComplimentary)
      .map((t) => Number(t.price))
      .filter((n) => !Number.isNaN(n));
    return prices.length ? Math.min(...prices) : 0;
  }, [tickets]);

  /* ---------- hydrate (edit mode) ---------- */
  useEffect(() => {
    if (!seedEventId) return;
    let cancelled = false;
    (async () => {
      setHydrating(true);
      try {
        const [detail, ticketRows] = await Promise.all([
          apiClient.managerEvent(seedEventId),
          apiClient.managerTickets(seedEventId),
        ]);
        if (cancelled) return;
        const event = unwrap(detail, null);
        if (!event) throw new Error('Event not found');
        setEventId(event._id || seedEventId);
        setBasics({
          title: event.title || '',
          description: event.description || '',
          category: event.category || 'Music',
          startsAt: toLocalDateTime(event.startsAt),
          endsAt: toLocalDateTime(event.endsAt),
          venue: {
            name: event.venue?.name || '',
            address: event.venue?.address || '',
            city: event.venue?.city || '',
            country: event.venue?.country || 'India',
          },
          featured: Boolean(event.featured),
        });
        setImageUrl(event.imageUrl || '');
        const rows = unwrapList(ticketRows);
        setTickets((rows.length ? rows : event.ticketTypes || []).map(ticketFromApi));
      } catch (failure) {
        notice(failure.response?.data?.message || 'Could not load event for editing.');
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seedEventId, notice]);

  /* ---------- validation ---------- */
  const validateStep = (index = step) => {
    const nextErr = {};
    if (index === 0) {
      if (!basics.title.trim()) nextErr.title = 'Title is required';
      if (!basics.description.trim()) nextErr.description = 'Description is required';
      if (!basics.startsAt) nextErr.startsAt = 'Start time required';
      if (!basics.venue.city.trim()) nextErr.city = 'City required';
      if (basics.endsAt && new Date(basics.endsAt) < new Date(basics.startsAt)) {
        nextErr.endsAt = 'End must be after start';
      }
    }
    if (index === 2) {
      const sellable = tickets.filter(isNonComplimentary);
      if (!sellable.length) nextErr.tickets = 'Add at least 1 paid ticket';
    }
    setErrors(nextErr);
    return Object.keys(nextErr).length === 0;
  };

  const canJumpTo = (index) => index <= step;

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  /* ---------- draft + publish ---------- */
  const ensureDraftEvent = async () => {
    if (eventId) return eventId;
    if (!validateStep(0)) {
      setStep(0);
      throw new Error('Basics incomplete');
    }
    const payload = {
      title: basics.title.trim(),
      description: basics.description.trim(),
      category: basics.category,
      startsAt: new Date(basics.startsAt).toISOString(),
      endsAt: basics.endsAt ? new Date(basics.endsAt).toISOString() : undefined,
      venue: {
        name: basics.venue.name.trim() || basics.venue.city.trim(),
        address: basics.venue.address.trim() || undefined,
        city: basics.venue.city.trim(),
        country: basics.venue.country.trim() || 'India',
      },
      imageUrl: imageUrl.trim() || undefined,
      featured: Boolean(basics.featured),
      status: 'draft',
      ticketTypes: [],
    };
    const created = await apiClient.managerCreateEvent(payload);
    const event = created.data.result;
    setEventId(event._id);
    notice(`Draft "${event.title}" saved.`);
    return event._id;
  };

  const openTicketFlow = async () => {
    try {
      setBusy(true);
      const id = await ensureDraftEvent();
      const locals = tickets.filter((r) => String(r._id || '').startsWith('local-'));
      for (const local of locals) {
        await apiClient.managerCreateTicket({
          eventId: id,
          event_id: id,
          name: local.name,
          description: local.description,
          hide_description: local.hideDescription,
          ticket_type: local.ticketType,
          price: local.price,
          door_price: local.doorPrice,
          quantity: local.quantity,
          currency: local.currency || 'INR',
          type: local.type || 'gate',
          sale_start: local.saleStartsAt || undefined,
          sale_end: local.saleEndsAt || undefined,
          pass_service_fee_to_buyer: local.passServiceFeeToBuyer,
          pass_payment_fee_to_buyer: local.passPaymentFeeToBuyer,
        });
      }
      const res = await apiClient.managerTickets(id);
      setTickets(unwrapList(res).map(ticketFromApi));
      setTicketFlowOpen(true);
    } catch (failure) {
      if (failure.message && !failure.response) return;
      notice(failure.response?.data?.message || 'Could not open ticket editor.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async (status) => {
    if (!validateStep(step)) return;
    setBusy(true);
    try {
      const id = eventId || (await ensureDraftEvent());
      const payload = {
        id,
        title: basics.title.trim(),
        description: basics.description.trim(),
        category: basics.category,
        startsAt: new Date(basics.startsAt).toISOString(),
        endsAt: basics.endsAt ? new Date(basics.endsAt).toISOString() : undefined,
        venue: {
          name: basics.venue.name.trim() || basics.venue.city.trim(),
          address: basics.venue.address.trim() || undefined,
          city: basics.venue.city.trim(),
          country: basics.venue.country.trim() || 'India',
        },
        imageUrl: imageUrl.trim() || undefined,
        featured: Boolean(basics.featured),
        status,
      };
      const updated = await apiClient.managerCreateEvent(payload);
      const event = updated.data.result;
      const finalId = event._id || id;

      for (const url of extraImages) {
        await apiClient.managerCreateImage({ eventId: finalId, url, type: 'flyer', sortOrder: 0 });
      }
      if (imageUrl.trim()) {
        await apiClient.managerCreateImage({
          eventId: finalId,
          url: imageUrl.trim(),
          type: 'cover',
          sortOrder: 0,
        });
      }
      for (const guest of guests) {
        await apiClient.managerCreateGuest({ eventId: finalId, name: guest.name, email: guest.email });
      }
      for (const handler of handlers) {
        await apiClient.managerAddHandler({ eventId: finalId, email: handler.email, type: handler.type });
      }
      for (const c of coupons) {
        await apiClient.managerCreateCoupon({
          event_id: finalId,
          code: c.code,
          discount_type: c.discount_type,
          discount_value: Number(c.discount_value),
        });
      }

      await reload();
      onCreated?.(event);
      notice(
        status === 'review_pending'
          ? `"${event.title}" submitted for admin approval.`
          : status === 'published'
            ? `"${event.title}" is live.`
            : `"${event.title}" saved as draft.`
      );
    } catch (failure) {
      notice(failure.response?.data?.message || 'Event could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------- render ---------- */
  if (hydrating) {
    return (
      <section className="mt-8 space-y-4">
        <div className="h-12 w-1/3 animate-pulse bg-ink/5" />
        <div className="h-64 animate-pulse bg-ink/5" />
      </section>
    );
  }

  if (ticketFlowOpen) {
    return (
      <section className="mt-8">
        <TicketFlow
          eventId={eventId}
          eventTitle={basics.title || 'Event'}
          tickets={tickets}
          onTicketsChange={setTickets}
          notice={notice}
          onClose={() => setTicketFlowOpen(false)}
        />
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
            >
              <ArrowLeft size={13} /> All events
            </button>
          )}
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">
            {seedEventId ? 'Edit event' : 'New event'}
          </p>
          <h2 className="serif mt-2 text-4xl leading-none sm:text-5xl">
            {seedEventId ? 'Update the night.' : 'Build the night.'}
          </h2>
        </div>
        <div className="border border-ink/15 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink/55">
          Step {step + 1} / {STEPS.length}
        </div>
      </div>

      {/* Wizard */}
      <WizardProgress
        steps={STEPS}
        current={step}
        onJump={setStep}
        canJumpTo={canJumpTo}
      />

      {/* Body */}
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0 space-y-6">
          {step === 0 && (
            <StepBasics basics={basics} setBasics={setBasics} errors={errors} />
          )}
          {step === 1 && (
            <StepMedia
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              extraImages={extraImages}
              setExtraImages={setExtraImages}
            />
          )}
          {step === 2 && (
            <StepTickets
              tickets={tickets}
              capacity={capacity}
              minPrice={minPrice}
              onOpenFlow={openTicketFlow}
              busy={busy}
            />
          )}
          {step === 3 && (
            <StepPeople
              guests={guests}
              setGuests={setGuests}
              handlers={handlers}
              setHandlers={setHandlers}
              notice={notice}
            />
          )}
          {step === 4 && (
            <StepCoupons coupons={coupons} setCoupons={setCoupons} notice={notice} />
          )}
          {step === 5 && (
            <StepReview
              basics={basics}
              tickets={tickets}
              capacity={capacity}
              minPrice={minPrice}
              guests={guests}
              handlers={handlers}
              coupons={coupons}
              isAdmin={isAdmin}
              busy={busy}
              onSaveDraft={() => publish('draft')}
              onPublish={() => publish(isAdmin ? 'published' : 'review_pending')}
            />
          )}

          {/* Nav footer (hidden on review) */}
          {step < STEPS.length - 1 && (
            <div className="flex items-center justify-between border-t border-ink/10 pt-6">
              <button
                type="button"
                disabled={step === 0 || busy}
                onClick={handleBack}
                className="inline-flex items-center gap-2 border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold hover:border-ink/30 disabled:opacity-30"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleNext}
                className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60"
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>

        <LivePreview
          basics={basics}
          imageUrl={imageUrl}
          tickets={tickets}
          capacity={capacity}
          minPrice={minPrice}
          guests={guests}
          handlers={handlers}
          coupons={coupons}
        />
      </div>
    </section>
  );
}
