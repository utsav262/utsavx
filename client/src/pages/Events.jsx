import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { categories, events as demoEvents } from '../data/demo.js';
import EventCard from '../components/events/EventCard.jsx';

export default function Events() {
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState('All events');
    const [eventType, setEventType] = useState('All');
    const [items, setItems] = useState(demoEvents);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [offline, setOffline] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPage(1);
    }, [term, category, eventType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(true);
            apiClient.events({
                search: term || undefined,
                category: category === 'All events' ? undefined : category,
                eventType: eventType === 'All' ? undefined : eventType,
                page,
                length: 9
            }).then((response) => {
                const result = unwrap(response);
                const rows = Array.isArray(result) ? result : [];
                setOffline(false);
                setItems((current) => page === 1 ? rows : [...current, ...rows]);
                setHasMore(Boolean(response.data?.pagination?.has_next_page));
            }).catch(() => {
                setOffline(true);
                setHasMore(false);
                setItems(demoEvents.filter((event) => {
                    const matchesCategory = category === 'All events' || event.category === category;
                    const matchesTerm = !term || `${event.title} ${event.city} ${event.category}`.toLowerCase().includes(term.toLowerCase());
                    return matchesCategory && matchesTerm;
                }));
            }).finally(() => setLoading(false));
        }, 200);
        return () => clearTimeout(timer);
    }, [term, category, eventType, page]);

    return (
        <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
            <div className="border-b border-ink/15 pb-8">
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Browse the good stuff</p>
                <h1 className="serif mt-2 text-6xl">All events</h1>
                {offline && <p className="mt-3 text-sm text-ink/55">Showing the local catalog while the API is offline.</p>}
            </div>
            <div className="sticky top-[73px] z-20 -mx-5 mb-10 flex flex-col gap-3 border-b border-ink/10 bg-cream/95 px-5 py-4 backdrop-blur lg:-mx-8 lg:px-8">
                <div className="flex flex-1 items-center gap-3 rounded-full border border-ink/15 px-4 py-2.5">
                    <Search size={17} />
                    <input value={term} onChange={(event) => setTerm(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search events, places, vibes" />
                </div>
                <div className="flex gap-2 overflow-auto">
                    {['All', 'This Weekend', 'Next Weekend', 'This Month'].map((item) => (
                        <button key={item} onClick={() => setEventType(item)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-extrabold ${eventType === item ? 'bg-coral text-white' : 'border border-ink/15'}`}>{item}</button>
                    ))}
                </div>
                <div className="flex gap-2 overflow-auto">
                    {categories.map((item) => (
                        <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-extrabold ${category === item ? 'bg-ink text-white' : 'border border-ink/15'}`}>{item}</button>
                    ))}
                </div>
            </div>
            {items.length ? (
                <>
                    <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{items.map((event) => <EventCard key={event.slug || event.id || event._id} event={event} />)}</div>
                    {hasMore && (
                        <div className="mt-12 text-center">
                            <button disabled={loading} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-ink/20 px-6 py-3 text-sm font-extrabold disabled:opacity-50">
                                {loading ? 'Loading…' : 'Load more'}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <p className="py-16 text-center text-ink/55">{loading ? 'Loading events…' : 'No events match that search yet.'}</p>
            )}
        </main>
    );
}
