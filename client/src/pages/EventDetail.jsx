import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { add } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { money } from '../lib/money.js';
import { formatDate } from '../lib/datetime.js';
import { events as demoEvents } from '../data/demo.js';
import EventCard from '../components/events/EventCard.jsx';

export default function EventDetail() {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const demo = demoEvents.find((item) => item.id === id);
    const [event, setEvent] = useState(demo || null);
    const [related, setRelated] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(!demo);
    const [ticketTypeId, setTicketTypeId] = useState(demo?.ticketTypes?.[0]?._id || '');

    useEffect(() => {
        let active = true;
        setLoading(true);
        apiClient.event(id).then((response) => {
            const result = unwrap(response, null);
            if (active && result && !Array.isArray(result)) {
                setEvent(result);
                const tickets = result.tickets || result.ticketTypes || [];
                setTicketTypeId(tickets[0]?._id || tickets[0]?.id || '');
                if (result._id || result.id) {
                    apiClient.relatedEvents(result._id || result.id).then((relatedResponse) => {
                        if (active) setRelated(unwrap(relatedResponse));
                    }).catch(() => { if (active) setRelated([]); });
                }
            }
        }).catch(() => {
            if (active && !demo) setEvent(null);
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [id]);

    if (loading) return <main className="mx-auto max-w-7xl px-5 py-20 text-ink/55">Loading event…</main>;
    if (!event) return <main className="mx-auto max-w-7xl px-5 py-20">Event not found. <Link to="/events" className="font-bold text-coral">Browse events</Link></main>;

    const title = event.title || event.name;
    const tickets = event.tickets || event.ticketTypes || [];
    const selected = tickets.find((ticket) => String(ticket._id || ticket.id) === String(ticketTypeId)) || tickets[0];
    const price = selected?.price ?? event.price ?? 0;
    const liveTicket = selected && String(selected._id || selected.id).length > 12;
    const cover = event.cover_image || event.image || event.imageUrl || event.horizontal_flyer;
    const fees = event._fee_settings;

    return (
        <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
                <div>
                    <img src={cover} className="aspect-[1.15] w-full bg-moss object-cover" alt="" />
                    {(event.flyer1 || event.flyer2) && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            {event.flyer1 && <img src={event.flyer1} className="aspect-[1.2] w-full object-cover" alt="" />}
                            {event.flyer2 && <img src={event.flyer2} className="aspect-[1.2] w-full object-cover" alt="" />}
                        </div>
                    )}
                </div>
                <div className="lg:pt-8">
                    <p className="text-sm font-extrabold uppercase tracking-[.2em] text-coral">{event.city || event.venue?.city || 'Featured event'}</p>
                    <h1 className="serif mt-3 text-6xl leading-[.9] sm:text-8xl">{title}</h1>
                    <p className="mt-7 text-lg leading-8 text-ink/70">{event.description}</p>
                    {event.host && <p className="mt-4 text-sm text-ink/55">Hosted by <b>{event.host.name || event.host.username}</b></p>}
                    <div className="my-8 grid grid-cols-2 border-y border-ink/15 py-5">
                        <div>
                            <CalendarDays className="text-coral" />
                            <p className="mt-2 text-sm font-bold">
                                {formatDate(event.startsAt || event.date) || 'Date TBA'}
                            </p>
                        </div>
                        <div>
                            <MapPin className="text-coral" />
                            <p className="mt-2 text-sm font-bold">{event.city || event.venue?.city || 'Venue details soon'}</p>
                        </div>
                    </div>
                    {tickets.length > 1 && (
                        <select value={ticketTypeId} onChange={(change) => setTicketTypeId(change.target.value)} className="mb-5 w-full rounded-full border border-ink/20 bg-transparent px-4 py-3 text-sm">
                            {tickets.map((ticket) => <option key={ticket._id || ticket.id} value={ticket._id || ticket.id}>{ticket.name} · {money(ticket.price)}{ticket.quantity_left != null ? ` · ${ticket.quantity_left} left` : ''}</option>)}
                        </select>
                    )}
                    <div className="flex items-center justify-between">
                        <p className="text-2xl font-extrabold">{money(price)} <span className="text-sm font-medium text-ink/50">/ person</span></p>
                        <div className="flex items-center rounded-full border border-ink/20">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3">−</button>
                            <span>{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-3">+</button>
                        </div>
                    </div>
                    {fees && (
                        <p className="mt-3 text-xs text-ink/45">
                            Fees: {fees.Online_Payment_Fee_percentage}% + {money(fees.Online_Payment_Fee_dollar_amount)} payment · {fees.Online_Service_Fee_percentage}% service ({fees.currency})
                        </p>
                    )}
                    <button
                        onClick={() => {
                            dispatch(add({
                                id: `${event._id || event.id || event.slug}-${selected?._id || selected?.id || 'ga'}`,
                                title,
                                price,
                                quantity,
                                eventId: event._id || event.id,
                                ticketTypeId: liveTicket ? (selected._id || selected.id) : undefined,
                                ticketName: selected?.name || 'General Admission'
                            }));
                            navigate('/cart');
                        }}
                        className="mt-5 w-full rounded-full bg-coral px-6 py-4 font-extrabold text-white"
                    >
                        Get tickets
                    </button>
                    {event.guests?.length > 0 && (
                        <div className="mt-8">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">Special guests</p>
                            <ul className="mt-3 space-y-2 text-sm">{event.guests.map((guest) => <li key={guest._id || guest.email}>{guest.name}</li>)}</ul>
                        </div>
                    )}
                </div>
            </div>
            {related.length > 0 && (
                <section className="mt-16 border-t border-ink/10 pt-12">
                    <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">More like this</p>
                    <h2 className="serif mt-2 text-4xl">Related events</h2>
                    <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {related.map((item) => <EventCard key={item.slug || item._id} event={item} />)}
                    </div>
                </section>
            )}
        </main>
    );
}
