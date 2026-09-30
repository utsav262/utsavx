import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarSearch, QrCode, Search, Smartphone, Ticket } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { useCategories } from '../lib/useCategories.js';
import { EVENT_PLACEHOLDER } from '../lib/placeholder.js';
import EventCard from '../components/events/EventCard.jsx';

const HERO_FALLBACK = 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85';

const STEPS = [
    { icon: CalendarSearch, title: 'Find something good', text: 'Browse by city or category, or search for an artist, venue or event.' },
    { icon: Smartphone, title: 'Pay in a couple of taps', text: 'UPI or card. The price you see is the price you pay — no booking fee.' },
    { icon: QrCode, title: 'Show your QR at the door', text: 'Your ticket lands in My tickets straight away. Staff scan it and you’re in.' }
];

const imageOf = (e) => e?.image || e?.imageUrl || e?.cover_image || e?.horizontal_flyer || EVENT_PLACEHOLDER;

function SkeletonCard() {
    return (
        <div className="animate-pulse">
            <div className="aspect-[1.15] bg-ink/10" />
            <div className="mt-4 h-3 w-1/3 bg-ink/10" />
            <div className="mt-2 h-5 w-3/4 bg-ink/10" />
        </div>
    );
}

export default function Home() {
    const navigate = useNavigate();
    const categories = useCategories();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        apiClient.events({ sort: 'date_asc', length: 8 })
            .then((response) => {
                const result = unwrap(response);
                setEvents(Array.isArray(result) ? result : []);
            })
            .catch(() => setEvents([]))
            .finally(() => setLoading(false));
    }, []);

    const search = (event) => {
        event.preventDefault();
        const q = query.trim();
        navigate(q ? `/events?q=${encodeURIComponent(q)}` : '/events');
    };

    const [lead, ...rest] = events;

    return (
        <>
            {/* ============ HERO ============ */}
            <section className="grain border-b border-ink/10">
                <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
                    <div>
                        <p className="mb-5 text-xs font-extrabold uppercase tracking-[.2em] text-coral">Live events across India</p>
                        <h1 className="serif text-5xl leading-[.95] sm:text-7xl">
                            Plans for tonight,<br /><i>tickets in a tap.</i>
                        </h1>
                        <p className="mt-6 max-w-md leading-7 text-ink/65">
                            Gigs, food markets, workshops, runs and more — book with UPI or card and walk in with a QR code.
                        </p>

                        <form onSubmit={search} className="mt-8 flex max-w-lg border border-ink/15 bg-white focus-within:border-coral">
                            <label htmlFor="home-search" className="sr-only">Search events</label>
                            <Search size={18} className="ml-4 self-center shrink-0 text-ink/40" />
                            <input
                                id="home-search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search events, venues or cities"
                                className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm outline-none"
                            />
                            <button type="submit" className="shrink-0 bg-coral px-5 text-sm font-extrabold text-white hover:bg-ink">Search</button>
                        </form>

                        {categories.length ? (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {categories.slice(0, 6).map((c) => (
                                    <Link key={c.slug} to={`/events?category=${encodeURIComponent(c.slug)}`} className="border border-ink/15 bg-white px-3 py-1.5 text-xs font-bold text-ink/70 hover:border-coral hover:text-coral">
                                        {c.name}
                                    </Link>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {/* Next event up, straight from the catalog */}
                    <div className="relative">
                        {loading ? (
                            <div className="h-[380px] animate-pulse bg-ink/10 sm:h-[480px]" />
                        ) : lead ? (
                            <Link to={`/events/${lead.slug || lead._id}`} className="group relative block overflow-hidden">
                                <img src={imageOf(lead)} alt="" className="h-[380px] w-full object-cover transition duration-500 group-hover:scale-[1.03] sm:h-[480px]" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-6 pt-24 text-white">
                                    <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-butter">Next up</p>
                                    <p className="serif mt-1 text-3xl leading-tight">{lead.title || lead.name}</p>
                                    <p className="mt-1 text-sm text-white/75">
                                        {new Date(lead.startsAt || lead.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        {' · '}{lead.city || lead.venue?.city || 'Venue TBA'}
                                    </p>
                                </div>
                            </Link>
                        ) : (
                            <img src={HERO_FALLBACK} alt="" className="h-[380px] w-full object-cover sm:h-[480px]" />
                        )}
                    </div>
                </div>
            </section>

            {/* ============ HAPPENING SOON ============ */}
            <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Happening soon</p>
                        <h2 className="serif mt-2 text-4xl sm:text-5xl">Don't miss these</h2>
                    </div>
                    <Link to="/events" className="inline-flex shrink-0 items-center gap-1 text-sm font-extrabold hover:text-coral">
                        See all <ArrowRight size={15} />
                    </Link>
                </div>
                {loading ? (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
                ) : events.length ? (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {(rest.length >= 4 ? rest : events).slice(0, 4).map((event) => <EventCard key={event.slug || event._id} event={event} />)}
                    </div>
                ) : (
                    <div className="border border-dashed border-ink/15 bg-white px-6 py-14 text-center">
                        <Ticket size={22} className="mx-auto text-coral" />
                        <p className="serif mt-3 text-2xl">New events are on the way</p>
                        <p className="mt-2 text-sm text-ink/55">Nothing is on sale right now. Check back soon — or host your own.</p>
                        <Link to="/organizer" className="mt-5 inline-block bg-coral px-5 py-2.5 text-sm font-extrabold text-white">Host an event</Link>
                    </div>
                )}
            </section>

            {/* ============ CATEGORIES ============ */}
            {categories.length ? (
                <section className="border-y border-ink/10 bg-white">
                    <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
                        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Browse by mood</p>
                        <h2 className="serif mt-2 text-4xl">What are you in the mood for?</h2>
                        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                            {categories.map((c) => (
                                <Link
                                    key={c.slug}
                                    to={`/events?category=${encodeURIComponent(c.slug)}`}
                                    className="group flex items-center justify-between border border-ink/10 bg-cream px-4 py-5 font-extrabold transition hover:border-coral hover:bg-white"
                                >
                                    {c.name}
                                    <ArrowRight size={16} className="text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-coral" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}

            {/* ============ HOW IT WORKS ============ */}
            <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Booking on MXO</p>
                <h2 className="serif mt-2 text-4xl">Three steps to the front door</h2>
                <ol className="mt-8 grid gap-4 md:grid-cols-3">
                    {STEPS.map(({ icon: Icon, title, text }, i) => (
                        <li key={title} className="border border-ink/10 bg-white p-6">
                            <div className="flex items-center gap-3">
                                <span className="serif text-3xl text-coral">{i + 1}</span>
                                <Icon size={20} className="text-ink/40" />
                            </div>
                            <h3 className="mt-3 font-extrabold">{title}</h3>
                            <p className="mt-1 text-sm text-ink/60">{text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* ============ HOST BAND ============ */}
            <section className="bg-ink text-white">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 md:flex-row md:items-center lg:px-8">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-butter">For organisers</p>
                        <p className="serif mt-2 text-3xl sm:text-4xl">Hosting something? Sell tickets on MXO.</p>
                        <p className="mt-2 max-w-xl text-white/60">Free to list. Sell online and for cash with your team, and scan guests in at the door.</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Link to="/how-it-works" className="border border-white/25 px-5 py-3 text-sm font-extrabold hover:border-white">How it works</Link>
                        <Link to="/organizer" className="bg-coral px-5 py-3 text-sm font-extrabold hover:bg-white hover:text-ink">Start hosting</Link>
                    </div>
                </div>
            </section>
        </>
    );
}
