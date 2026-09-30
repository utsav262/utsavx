import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { money } from '../../lib/money.js';
import { EVENT_PLACEHOLDER } from '../../lib/placeholder.js';

const when = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export default function EventCard({ event }) {
    const id = event.slug || event.id || event._id;
    const title = event.title || event.name;
    const city = event.city || event.venue?.city || 'Venue TBA';
    const image = event.image || event.imageUrl || event.cover_image || event.horizontal_flyer || EVENT_PLACEHOLDER;
    const prices = (event.ticketTypes || []).map((t) => Number(t.price)).filter((n) => Number.isFinite(n));
    const price = prices.length ? Math.min(...prices) : Number(event.price ?? 0);
    const soldOut = event.status === 'sold-out';
    const date = when(event.startsAt || event.date);

    return (
        <Link to={`/events/${id}`} className="event-card group block">
            <div className="relative aspect-[1.15] overflow-hidden bg-moss">
                <img src={image} className="event-image h-full w-full object-cover" alt="" loading="lazy" />
                <span className="absolute left-3 top-3 bg-cream px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.15em]">{event.category || 'Experience'}</span>
                {soldOut ? <span className="absolute right-3 top-3 bg-ink px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.15em] text-white">Sold out</span> : null}
            </div>
            <div className="pt-4">
                {date ? <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-coral"><CalendarDays size={13} />{date}</p> : null}
                <h3 className="serif mt-1.5 text-2xl leading-tight transition group-hover:text-coral">{title}</h3>
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                    <p className="flex min-w-0 items-center gap-1 text-ink/60"><MapPin size={13} className="shrink-0" /><span className="truncate">{city}</span></p>
                    <p className="shrink-0 font-extrabold">{price > 0 ? `From ${money(price)}` : 'Free'}</p>
                </div>
            </div>
        </Link>
    );
}
