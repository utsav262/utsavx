import { CalendarDays, MapPin } from 'lucide-react';
import { formatDateTime } from '../../lib/datetime.js';

export function roleLabel(type) {
    if (type === 'Event_Scanner') return 'Event Scanner';
    if (type === 'Manager') return 'Event Manager';
    if (type === 'Ambassador') return 'Ambassador';
    if (type === 'Outlet') return 'Outlet';
    return type || 'Staff';
}

export function statusLabel(status) {
    if (status === 'A') return 'Accepted';
    if (status === 'D') return 'Declined';
    return 'Pending';
}

export function place(event) {
    if (!event?.venue) return 'Venue TBA';
    return [event.venue.name, event.venue.city].filter(Boolean).join(', ') || 'Venue TBA';
}

export function eventCover(event) {
    return (
        event?.imageUrl ||
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80'
    );
}

export function eventIdOf(invite) {
    return invite?.event?._id || invite?.event?.id || invite?.event;
}

export function SectionHeader({ eyebrow, title, subtitle, action }) {
    return (
        <div className="flex flex-col justify-between gap-4 border-b border-ink/15 pb-6 sm:flex-row sm:items-end">
            <div>
                {eyebrow ? (
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">{eyebrow}</p>
                ) : null}
                <h2 className="serif mt-2 text-4xl leading-none sm:text-5xl">{title}</h2>
                {subtitle ? <p className="mt-3 max-w-xl text-sm text-ink/55">{subtitle}</p> : null}
            </div>
            {action || null}
        </div>
    );
}

export function EmptyState({ title, body }) {
    return (
        <div className="mt-8 border border-dashed border-ink/20 bg-white/60 px-6 py-14 text-center">
            <p className="serif text-2xl">{title}</p>
            {body ? <p className="mx-auto mt-3 max-w-md text-sm text-ink/55">{body}</p> : null}
        </div>
    );
}

export function EventMeta({ event, className = '' }) {
    return (
        <div className={`space-y-2 text-sm text-ink/60 ${className}`}>
            <p className="flex items-center gap-2">
                <CalendarDays size={14} className="text-coral" />
                {formatDateTime(event?.startsAt) || 'Date TBA'}
            </p>
            <p className="flex items-center gap-2">
                <MapPin size={14} className="text-coral" />
                {place(event)}
            </p>
        </div>
    );
}
