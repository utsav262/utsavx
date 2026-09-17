import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { events as demoEvents } from '../data/demo.js';
import EventCard from '../components/events/EventCard.jsx';

export default function Home() {
    const [featured, setFeatured] = useState(demoEvents);
    useEffect(() => {
        apiClient.events({ featured: true, length: 4 }).then((response) => {
            const result = unwrap(response);
            if (Array.isArray(result) && result.length) setFeatured(result);
        }).catch(() => {});
    }, []);
    return (
        <>
            <section className="grain border-b border-ink/10">
                <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_.9fr] lg:px-8 lg:py-24">
                    <div>
                        <p className="mb-5 text-xs font-extrabold uppercase tracking-[.2em] text-coral">Made for India</p>
                        <h1 className="serif text-6xl leading-[.9] sm:text-8xl">Find your<br /><i>next utsav.</i></h1>
                        <p className="mt-7 max-w-md leading-7 text-ink/65">Concerts, food markets, workshops, and community runs across Delhi, Mumbai, Bengaluru, and beyond — priced in ₹.</p>
                        <Link to="/events" className="mt-8 inline-flex items-center gap-3 rounded-full bg-coral px-6 py-3.5 text-sm font-extrabold text-white">Explore events <ChevronRight size={18} /></Link>
                    </div>
                    <img src="https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85" className="h-[390px] w-full object-cover sm:h-[510px]" alt="Live event" />
                </div>
            </section>
            <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
                <div className="mb-8 flex items-end justify-between">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Handpicked for you</p>
                        <h2 className="serif mt-2 text-5xl">What’s on</h2>
                    </div>
                    <Link to="/events" className="text-sm font-extrabold">See all <ChevronRight className="inline" size={16} /></Link>
                </div>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{featured.slice(0, 4).map((event) => <EventCard key={event.slug || event.id || event._id} event={event} />)}</div>
            </section>
        </>
    );
}
