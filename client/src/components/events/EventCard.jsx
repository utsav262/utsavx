import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { money } from '../../lib/money.js';

export default function EventCard({ event }) {
    const id = event.slug || event.id || event._id;
    const title = event.title || event.name;
    const city = event.city || event.venue?.city || 'Online / TBA';
    const image = event.image || event.imageUrl || event.cover_image || event.horizontal_flyer || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80';
    const price = event.price ?? event.ticketTypes?.[0]?.price ?? 0;
    return (
        <Link to={`/events/${id}`} className="event-card group block">
            <div className="relative aspect-[1.15] overflow-hidden bg-moss">
                <img src={image} className="event-image h-full w-full object-cover" alt="" />
                <span className="absolute left-3 top-3 rounded-full bg-cream px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.15em]">{event.category || 'Experience'}</span>
            </div>
            <div className="flex justify-between gap-4 pt-4">
                <div>
                    <h3 className="serif text-2xl leading-none">{title}</h3>
                    <p className="mt-2 flex items-center gap-1 text-sm text-ink/60"><MapPin size={13} />{city}</p>
                </div>
                <p className="font-extrabold">{money(price)}</p>
            </div>
        </Link>
    );
}
