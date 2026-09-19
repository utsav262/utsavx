import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Check,
    Image as ImageIcon,
    MapPin,
    Plus,
    Ticket,
    Trash2,
    Users
} from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { money } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import TicketFlow from '../tickets/TicketFlow.jsx';
import {
    formatQty,
    formatTicketPrice,
    isNonComplimentary,
    ticketFromApi
} from '../tickets/ticketUtils.js';

const input =
    'w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-base outline-none transition placeholder:text-ink/35 focus:border-coral';
const label = 'block text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45';

const STEPS = [
    { id: 'basics', label: 'Basics', hint: 'Name, when, where' },
    { id: 'media', label: 'Look', hint: 'Cover & gallery' },
    { id: 'tickets', label: 'Event type', hint: 'Tickets & capacity' },
    { id: 'people', label: 'People', hint: 'Guests & team' },
    { id: 'coupons', label: 'Offers', hint: 'Promo codes' },
    { id: 'review', label: 'Submit', hint: 'Admin approval' }
];

const emptyBasics = {
    title: '',
    description: '',
    category: 'Music',
    startsAt: '',
    endsAt: '',
    venue: { name: '', address: '', city: '', country: 'India' },
    featured: false
};

function toLocalDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWhen(value) {
    return formatDateTime(value) || 'Date TBA';
}

function LivePreview({ basics, imageUrl, tickets, capacity, minPrice, guests, handlers, coupons }) {
    const cover =
        imageUrl ||
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80';
    const place = [basics.venue.name, basics.venue.city].filter(Boolean).join(' · ') || 'Venue TBA';

    return (
        <aside className="sticky top-24 overflow-hidden border border-ink/10 bg-ink text-white">
            <div className="relative aspect-[4/3] overflow-hidden">
                <img src={cover} alt="" className="h-full w-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-butter">
                        {basics.category || 'Event'}
                        {basics.featured ? ' · Featured' : ''}
                    </p>
                    <h3 className="serif mt-2 text-3xl leading-none">
                        {basics.title.trim() || 'Untitled event'}
                    </h3>
                </div>
            </div>
            <div className="space-y-4 p-5">
                <p className="text-sm leading-6 text-white/70">
                    {basics.description.trim() || 'Your description will preview here as you type.'}
                </p>
                <div className="grid gap-3 border-y border-white/10 py-4 text-sm">
                    <p className="flex items-start gap-2">
                        <CalendarDays size={15} className="mt-0.5 shrink-0 text-butter" />
                        <span>{formatWhen(basics.startsAt)}</span>
                    </p>
                    <p className="flex items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-butter" />
                        <span>{place}</span>
                    </p>
                    <p className="flex items-start gap-2">
                        <Ticket size={15} className="mt-0.5 shrink-0 text-butter" />
                        <span>
                            {tickets.length} tier{tickets.length === 1 ? '' : 's'} · {capacity || '∞'} seats · from{' '}
                            {money(minPrice)}
                        </span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider text-white/55">
                    <span>{guests.length} guests</span>
                    <span>·</span>
                    <span>{handlers.length} team</span>
                    <span>·</span>
                    <span>{coupons.length} offers</span>
                </div>
            </div>
        </aside>
    );
}

export default function CreateEventFlow({ reload, notice, onCreated, onCancel, eventId: seedEventId }) {
    const user = useSelector((state) => state.auth.user);
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
    const [guestDraft, setGuestDraft] = useState({ name: '', email: '' });
    const [handlerDraft, setHandlerDraft] = useState({ email: '', type: 'staff' });
    const [couponDraft, setCouponDraft] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: '10'
    });
    const [extraImageDraft, setExtraImageDraft] = useState('');
    const [hydrating, setHydrating] = useState(Boolean(seedEventId));

    const capacity = useMemo(
        () =>
            tickets.reduce((sum, ticket) => {
                const qty = Number(ticket.quantity || 0);
                return sum + (qty > 0 ? qty : 0);
            }, 0),
        [tickets]
    );
    const minPrice = useMemo(() => {
        const prices = tickets
            .filter(isNonComplimentary)
            .map((ticket) => Number(ticket.price))
            .filter((price) => !Number.isNaN(price));
        return prices.length ? Math.min(...prices) : 0;
    }, [tickets]);

    useEffect(() => {
        if (!seedEventId) return;
        let cancelled = false;
        (async () => {
            setHydrating(true);
            try {
                const [detail, ticketRows] = await Promise.all([
                    apiClient.managerEvent(seedEventId),
                    apiClient.managerTickets(seedEventId)
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
                        country: event.venue?.country || 'India'
                    },
                    featured: Boolean(event.featured)
                });
                setImageUrl(event.imageUrl || '');
                const rows = unwrapList(ticketRows);
                setTickets(
                    (rows.length ? rows : event.ticketTypes || []).map((row) => ticketFromApi(row))
                );
            } catch (failure) {
                notice(failure.response?.data?.message || 'Could not load event for editing.');
            } finally {
                if (!cancelled) setHydrating(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [seedEventId]);

    const validateStep = () => {
        if (step === 0) {
            if (!basics.title.trim()) return 'Event title is required.';
            if (!basics.description.trim()) return 'Description is required.';
            if (!basics.startsAt) return 'Start date and time are required.';
            if (!basics.venue.city.trim()) return 'City is required.';
            if (basics.endsAt && new Date(basics.endsAt) < new Date(basics.startsAt)) {
                return 'End time must be after start time.';
            }
        }
        if (step === 2) {
            const sellable = tickets.filter(isNonComplimentary);
            if (!sellable.length) return 'Add at least one non-complimentary ticket before continuing.';
            for (const ticket of sellable) {
                if (!String(ticket.name || '').trim()) return 'Every ticket needs a name.';
            }
        }
        return '';
    };

    const ensureDraftEvent = async () => {
        if (eventId) return eventId;
        if (!basics.title.trim()) {
            notice('Event title is required.');
            setStep(0);
            throw new Error('Event title is required.');
        }
        if (!basics.description.trim()) {
            notice('Description is required.');
            setStep(0);
            throw new Error('Description is required.');
        }
        if (!basics.startsAt) {
            notice('Start date and time are required.');
            setStep(0);
            throw new Error('Start date and time are required.');
        }
        if (!basics.venue.city.trim()) {
            notice('City is required.');
            setStep(0);
            throw new Error('City is required.');
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
                country: basics.venue.country.trim() || 'India'
            },
            imageUrl: imageUrl.trim() || undefined,
            featured: Boolean(basics.featured),
            status: 'draft',
            ticketTypes: []
        };
        const created = await apiClient.managerCreateEvent(payload);
        const event = created.data.result;
        setEventId(event._id);
        notice(`Draft “${event.title}” saved — add tickets next.`);
        return event._id;
    };

    const openTicketFlow = async () => {
        try {
            setBusy(true);
            const id = await ensureDraftEvent();
            const locals = tickets.filter((row) => String(row._id || '').startsWith('local-'));
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
                    pass_payment_fee_to_buyer: local.passPaymentFeeToBuyer
                });
            }
            const response = await apiClient.managerTickets(id);
            setTickets(unwrapList(response).map(ticketFromApi));
            setTicketFlowOpen(true);
        } catch (failure) {
            if (failure.message && !failure.response) return;
            notice(failure.response?.data?.message || 'Could not open ticket editor.');
        } finally {
            setBusy(false);
        }
    };

    const next = () => {
        const error = validateStep();
        if (error) return notice(error);
        notice('');
        setStep((current) => Math.min(current + 1, STEPS.length - 1));
    };

    const back = () => {
        notice('');
        setStep((current) => Math.max(current - 1, 0));
    };

    const resetFlow = () => {
        setStep(0);
        setEventId(null);
        setBasics(emptyBasics);
        setImageUrl('');
        setExtraImages([]);
        setTickets([]);
        setTicketFlowOpen(false);
        setGuests([]);
        setHandlers([]);
        setCoupons([]);
        setGuestDraft({ name: '', email: '' });
        setHandlerDraft({ email: '', type: 'staff' });
        setCouponDraft({ code: '', discount_type: 'percentage', discount_value: '10' });
        setExtraImageDraft('');
    };

    const publish = async (status) => {
        const error = validateStep();
        if (error) return notice(error);
        setBusy(true);
        notice('');
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
                    country: basics.venue.country.trim() || 'India'
                },
                imageUrl: imageUrl.trim() || undefined,
                featured: Boolean(basics.featured),
                status
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
                    sortOrder: 0
                });
            }
            for (const guest of guests) {
                await apiClient.managerCreateGuest({ eventId: finalId, name: guest.name, email: guest.email });
            }
            for (const handler of handlers) {
                await apiClient.managerAddHandler({
                    eventId: finalId,
                    email: handler.email,
                    type: handler.type
                });
            }
            for (const coupon of coupons) {
                await apiClient.managerCreateCoupon({
                    event_id: finalId,
                    code: coupon.code,
                    discount_type: coupon.discount_type,
                    discount_value: Number(coupon.discount_value)
                });
            }

            await reload();
            if (onCreated) onCreated(event);
            if (!seedEventId) resetFlow();
            notice(
                status === 'review_pending'
                    ? `“${event.title}” was submitted for admin approval. It goes live after approval.`
                    : status === 'published'
                        ? `“${event.title}” is live and ready to sell.`
                        : `“${event.title}” saved as draft. You can submit it for approval later.`
            );
        } catch (failure) {
            notice(failure.response?.data?.message || 'Event could not be saved.');
        } finally {
            setBusy(false);
        }
    };

    if (hydrating) {
        return (
            <section className="mt-8 border border-ink/10 px-6 py-16 text-center text-ink/50">
                Loading event…
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
        <section className="mt-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-6">
                <div>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="mb-3 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
                        >
                            <ArrowLeft size={14} /> All events
                        </button>
                    )}
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">
                        {seedEventId ? 'Edit event' : 'New event'}
                    </p>
                    <h2 className="serif mt-2 text-4xl leading-none sm:text-5xl">
                        {seedEventId ? 'Update the night.' : 'Build the night.'}
                    </h2>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-ink/60">
                        Fill the left. Watch the buyer preview update on the right.
                    </p>
                </div>
                <p className="rounded-full border border-ink/15 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink/55">
                    Step {step + 1} / {STEPS.length}
                </p>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
                {STEPS.map((item, index) => {
                    const active = index === step;
                    const done = index < step;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                if (index <= step) setStep(index);
                            }}
                            className={`min-w-[7.5rem] flex-1 border px-3 py-3 text-left transition ${
                                active
                                    ? 'border-coral bg-coral text-white'
                                    : done
                                      ? 'border-ink/20 bg-white text-ink'
                                      : 'border-ink/10 text-ink/40'
                            }`}
                        >
                            <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider">
                                <span
                                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                                        active
                                            ? 'bg-white text-coral'
                                            : done
                                              ? 'bg-moss text-white'
                                              : 'bg-ink/10'
                                    }`}
                                >
                                    {done ? <Check size={11} /> : index + 1}
                                </span>
                                {item.label}
                            </span>
                            <span
                                className={`mt-1 block text-[11px] ${active ? 'text-white/80' : 'text-ink/45'}`}
                            >
                                {item.hint}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="min-w-0">
                    {step === 0 && (
                        <div className="space-y-8">
                            <div>
                                <label className={label}>Event title</label>
                                <input
                                    className={`${input} serif text-3xl`}
                                    placeholder="Midnight Market"
                                    value={basics.title}
                                    onChange={(e) => setBasics({ ...basics, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className={label}>Description</label>
                                <textarea
                                    rows={4}
                                    className={`${input} resize-none leading-7`}
                                    placeholder="Tell people what this night feels like…"
                                    value={basics.description}
                                    onChange={(e) => setBasics({ ...basics, description: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div>
                                    <label className={label}>Starts</label>
                                    <input
                                        type="datetime-local"
                                        className={input}
                                        value={basics.startsAt}
                                        onChange={(e) => setBasics({ ...basics, startsAt: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className={label}>Ends (optional)</label>
                                    <input
                                        type="datetime-local"
                                        className={input}
                                        value={basics.endsAt}
                                        onChange={(e) => setBasics({ ...basics, endsAt: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={label}>Category</label>
                                <select
                                    className={input}
                                    value={basics.category}
                                    onChange={(e) => setBasics({ ...basics, category: e.target.value })}
                                >
                                    {['Music', 'Food & Drink', 'Workshop', 'Wellness', 'Conference'].map(
                                        (item) => (
                                            <option key={item}>{item}</option>
                                        )
                                    )}
                                </select>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div>
                                    <label className={label}>Venue</label>
                                    <input
                                        className={input}
                                        placeholder="Venue name"
                                        value={basics.venue.name}
                                        onChange={(e) =>
                                            setBasics({
                                                ...basics,
                                                venue: { ...basics.venue, name: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className={label}>City</label>
                                    <input
                                        className={input}
                                        placeholder="Mumbai"
                                        value={basics.venue.city}
                                        onChange={(e) =>
                                            setBasics({
                                                ...basics,
                                                venue: { ...basics.venue, city: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className={label}>Address</label>
                                    <input
                                        className={input}
                                        placeholder="Street address"
                                        value={basics.venue.address}
                                        onChange={(e) =>
                                            setBasics({
                                                ...basics,
                                                venue: { ...basics.venue, address: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className={label}>Country</label>
                                    <input
                                        className={input}
                                        placeholder="India"
                                        value={basics.venue.country}
                                        onChange={(e) =>
                                            setBasics({
                                                ...basics,
                                                venue: { ...basics.venue, country: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-3 text-sm text-ink/70">
                                <input
                                    type="checkbox"
                                    className="accent-coral"
                                    checked={basics.featured}
                                    onChange={(e) => setBasics({ ...basics, featured: e.target.checked })}
                                />
                                Feature on the public home page when published
                            </label>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className={label}>Cover image URL</label>
                                <input
                                    className={input}
                                    placeholder="https://…"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                                <p className="mt-2 text-xs text-ink/45">
                                    Paste a hosted image URL. Direct S3 upload is not enabled in this build.
                                </p>
                            </div>
                            {imageUrl ? (
                                <div className="overflow-hidden border border-ink/10">
                                    <img
                                        src={imageUrl}
                                        alt="Cover preview"
                                        className="aspect-[16/9] w-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.opacity = '0.3';
                                        }}
                                    />
                                </div>
                            ) : null}
                            <div>
                                <label className={label}>Gallery images</label>
                                <div className="mt-2 flex gap-2">
                                    <input
                                        className={input}
                                        placeholder="Extra image URL"
                                        value={extraImageDraft}
                                        onChange={(e) => setExtraImageDraft(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="shrink-0 border border-ink bg-ink px-4 text-white"
                                        onClick={() => {
                                            if (!extraImageDraft.trim()) return;
                                            setExtraImages((rows) => [...rows, extraImageDraft.trim()]);
                                            setExtraImageDraft('');
                                        }}
                                    >
                                        <ImageIcon size={16} />
                                    </button>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    {extraImages.map((url, index) => (
                                        <div key={`${url}-${index}`} className="group relative border border-ink/10">
                                            <img src={url} alt="" className="aspect-square w-full object-cover" />
                                            <button
                                                type="button"
                                                className="absolute right-2 top-2 bg-ink/80 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                                                onClick={() =>
                                                    setExtraImages((rows) => rows.filter((_, i) => i !== index))
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <p className={label}>Event type</p>
                                <h3 className="serif mt-2 text-3xl">Tickets</h3>
                                <p className="mt-2 text-sm text-ink/55">
                                    Submit for review needs at least one non-complimentary ticket. Sell and team
                                    allotments use these tiers later.
                                </p>
                            </div>

                            <div className="border border-ink/10 bg-white p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold">
                                            {tickets.length
                                                ? `${tickets.length} ticket tier${tickets.length === 1 ? '' : 's'}`
                                                : 'No tickets yet'}
                                        </p>
                                        <p className="mt-1 text-xs text-ink/50">
                                            {capacity ? `${capacity} seats` : 'Unlimited / unset'} · from{' '}
                                            {money(minPrice)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={openTicketFlow}
                                        className="inline-flex items-center gap-2 bg-coral px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                                    >
                                        <Plus size={14} />
                                        {tickets.length ? 'Manage tickets' : 'Add tickets'}
                                    </button>
                                </div>

                                {tickets.length ? (
                                    <ul className="mt-5 divide-y divide-ink/10 border-t border-ink/10">
                                        {tickets.map((ticket) => (
                                            <li
                                                key={ticket._id || ticket.name}
                                                className="flex justify-between py-3 text-sm"
                                            >
                                                <span className="font-medium">{ticket.name}</span>
                                                <span className="text-ink/55">
                                                    {formatTicketPrice(ticket)} · {formatQty(ticket.quantity)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10">
                            <div>
                                <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-ink/45">
                                    <Users size={14} /> Featured guests
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <input
                                        className="min-w-[140px] flex-1 border-b border-ink/20 bg-transparent px-0 py-2 text-sm outline-none focus:border-coral"
                                        placeholder="Name"
                                        value={guestDraft.name}
                                        onChange={(e) =>
                                            setGuestDraft({ ...guestDraft, name: e.target.value })
                                        }
                                    />
                                    <input
                                        type="email"
                                        className="min-w-[160px] flex-1 border-b border-ink/20 bg-transparent px-0 py-2 text-sm outline-none focus:border-coral"
                                        placeholder="Email"
                                        value={guestDraft.email}
                                        onChange={(e) =>
                                            setGuestDraft({ ...guestDraft, email: e.target.value })
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="bg-ink px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white"
                                        onClick={() => {
                                            if (!guestDraft.name.trim() || !guestDraft.email.trim()) {
                                                return notice('Guest name and email are required.');
                                            }
                                            setGuests((rows) => [...rows, { ...guestDraft }]);
                                            setGuestDraft({ name: '', email: '' });
                                            notice('');
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                                <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
                                    {guests.map((guest, index) => (
                                        <li
                                            key={`${guest.email}-${index}`}
                                            className="flex justify-between py-3 text-sm"
                                        >
                                            <span>
                                                {guest.name}
                                                <span className="text-ink/45"> · {guest.email}</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="text-coral"
                                                onClick={() =>
                                                    setGuests((rows) => rows.filter((_, i) => i !== index))
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                    {!guests.length && (
                                        <li className="py-4 text-sm text-ink/45">No guests yet — optional.</li>
                                    )}
                                </ul>
                            </div>
                            <div>
                                <p className={label}>Team invites</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <input
                                        type="email"
                                        className="min-w-[180px] flex-1 border-b border-ink/20 bg-transparent px-0 py-2 text-sm outline-none focus:border-coral"
                                        placeholder="Email"
                                        value={handlerDraft.email}
                                        onChange={(e) =>
                                            setHandlerDraft({ ...handlerDraft, email: e.target.value })
                                        }
                                    />
                                    <select
                                        className="border-b border-ink/20 bg-transparent py-2 text-sm outline-none"
                                        value={handlerDraft.type}
                                        onChange={(e) =>
                                            setHandlerDraft({ ...handlerDraft, type: e.target.value })
                                        }
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="ambassador">Ambassador</option>
                                        <option value="outlet">Outlet</option>
                                    </select>
                                    <button
                                        type="button"
                                        className="bg-ink px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white"
                                        onClick={() => {
                                            if (!handlerDraft.email.trim()) {
                                                return notice('Team email is required.');
                                            }
                                            setHandlers((rows) => [...rows, { ...handlerDraft }]);
                                            setHandlerDraft({ email: '', type: 'staff' });
                                            notice('');
                                        }}
                                    >
                                        Invite
                                    </button>
                                </div>
                                <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
                                    {handlers.map((handler, index) => (
                                        <li
                                            key={`${handler.email}-${index}`}
                                            className="flex justify-between py-3 text-sm"
                                        >
                                            <span>
                                                {handler.email}
                                                <span className="text-ink/45"> · {handler.type}</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="text-coral"
                                                onClick={() =>
                                                    setHandlers((rows) => rows.filter((_, i) => i !== index))
                                                }
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                    {!handlers.length && (
                                        <li className="py-4 text-sm text-ink/45">No team invites yet.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-5">
                            <p className="text-sm text-ink/55">Optional promo codes for this event only.</p>
                            <div className="flex flex-wrap gap-3">
                                <input
                                    className="min-w-[120px] flex-1 border-b border-ink/20 bg-transparent py-2 text-sm uppercase outline-none focus:border-coral"
                                    placeholder="CODE"
                                    value={couponDraft.code}
                                    onChange={(e) =>
                                        setCouponDraft({ ...couponDraft, code: e.target.value })
                                    }
                                />
                                <select
                                    className="border-b border-ink/20 bg-transparent py-2 text-sm"
                                    value={couponDraft.discount_type}
                                    onChange={(e) =>
                                        setCouponDraft({ ...couponDraft, discount_type: e.target.value })
                                    }
                                >
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-24 border-b border-ink/20 bg-transparent py-2 text-sm outline-none"
                                    placeholder="Value"
                                    value={couponDraft.discount_value}
                                    onChange={(e) =>
                                        setCouponDraft({
                                            ...couponDraft,
                                            discount_value: e.target.value
                                        })
                                    }
                                />
                                <button
                                    type="button"
                                    className="bg-ink px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white"
                                    onClick={() => {
                                        if (!couponDraft.code.trim()) return notice('Coupon code is required.');
                                        if (
                                            couponDraft.discount_value === '' ||
                                            Number(couponDraft.discount_value) < 0
                                        ) {
                                            return notice('Coupon value is invalid.');
                                        }
                                        if (
                                            couponDraft.discount_type === 'percentage' &&
                                            Number(couponDraft.discount_value) > 100
                                        ) {
                                            return notice('Percentage cannot exceed 100.');
                                        }
                                        setCoupons((rows) => [
                                            ...rows,
                                            {
                                                ...couponDraft,
                                                code: couponDraft.code.trim().toUpperCase()
                                            }
                                        ]);
                                        setCouponDraft({
                                            code: '',
                                            discount_type: 'percentage',
                                            discount_value: '10'
                                        });
                                        notice('');
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                            <ul className="divide-y divide-ink/10 border-y border-ink/10">
                                {coupons.map((coupon, index) => (
                                    <li
                                        key={`${coupon.code}-${index}`}
                                        className="flex justify-between py-3 text-sm"
                                    >
                                        <span>
                                            <b>{coupon.code}</b>
                                            <span className="text-ink/50">
                                                {' '}
                                                ·{' '}
                                                {coupon.discount_type === 'percentage'
                                                    ? `${coupon.discount_value}%`
                                                    : money(coupon.discount_value)}
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            className="text-coral"
                                            onClick={() =>
                                                setCoupons((rows) => rows.filter((_, i) => i !== index))
                                            }
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </li>
                                ))}
                                {!coupons.length && (
                                    <li className="py-4 text-sm text-ink/45">No coupons — skip if you want.</li>
                                )}
                            </ul>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6">
                            <div className="border border-ink/15 bg-white p-6">
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">
                                    Ready to launch
                                </p>
                                <h3 className="serif mt-3 text-4xl leading-none">
                                    {basics.title || 'Untitled event'}
                                </h3>
                                <p className="mt-4 text-sm leading-7 text-ink/65">
                                    {basics.description || 'No description yet.'}
                                </p>
                                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-ink/40">When</dt>
                                        <dd className="mt-1 font-bold">{formatWhen(basics.startsAt)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-ink/40">Where</dt>
                                        <dd className="mt-1 font-bold">
                                            {[basics.venue.name, basics.venue.city, basics.venue.country]
                                                .filter(Boolean)
                                                .join(', ') || '—'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-ink/40">Tickets</dt>
                                        <dd className="mt-1 font-bold">
                                            {tickets.length} tiers · {capacity || '∞'} capacity
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-ink/40">From</dt>
                                        <dd className="mt-1 font-bold">{money(minPrice)}</dd>
                                    </div>
                                </dl>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => publish('draft')}
                                    className="flex-1 border border-ink/20 px-5 py-4 text-sm font-extrabold uppercase tracking-wider disabled:opacity-60"
                                >
                                    {busy ? 'Saving…' : 'Save draft'}
                                </button>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => publish(isAdmin ? 'published' : 'review_pending')}
                                    className="flex-1 bg-coral px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                                >
                                    {busy
                                        ? isAdmin
                                            ? 'Publishing…'
                                            : 'Submitting…'
                                        : isAdmin
                                          ? 'Publish event'
                                          : 'Submit for approval'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 flex items-center justify-between border-t border-ink/10 pt-6">
                        <button
                            type="button"
                            disabled={step === 0 || busy}
                            onClick={back}
                            className="inline-flex items-center gap-2 text-sm font-extrabold disabled:opacity-30"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        {step < STEPS.length - 1 ? (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={next}
                                className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-extrabold uppercase tracking-wider text-white"
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        ) : (
                            <span className="text-xs uppercase tracking-wider text-ink/40">
                                Choose draft or publish
                            </span>
                        )}
                    </div>
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
