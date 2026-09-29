import { CalendarDays, MapPin, Ticket, Star, Sparkles } from 'lucide-react';
import { formatDateTime } from '../../../lib/datetime.js';
import { money } from '../../../lib/money.js';
import { EVENT_PLACEHOLDER } from '../../../lib/placeholder.js';

const FALLBACK =
  EVENT_PLACEHOLDER;

export default function LivePreview({ basics, imageUrl, tickets, capacity, minPrice, guests, handlers, coupons }) {
  const cover = imageUrl || FALLBACK;
  const place =
    [basics.venue.name, basics.venue.city].filter(Boolean).join(' · ') || 'Venue TBA';
  const when = formatDateTime(basics.startsAt) || 'Date TBA';

  return (
    <aside className="sticky top-24 space-y-4">
      {/* Preview card */}
      <div className="overflow-hidden border border-ink/10 bg-ink text-white shadow-xl">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={cover} alt="" className="h-full w-full object-cover opacity-95" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

          {/* Top badges */}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="bg-coral px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              Preview
            </span>
            {basics.featured && (
              <span className="inline-flex items-center gap-1 bg-amber-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
                <Star size={10} className="fill-white" /> Featured
              </span>
            )}
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-butter">
              {basics.category || 'Event'}
            </p>
            <h3 className="serif mt-2 line-clamp-2 text-3xl leading-none">
              {basics.title.trim() || 'Untitled event'}
            </h3>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="line-clamp-3 text-sm leading-6 text-white/70">
            {basics.description.trim() ||
              'Your description will preview here as you type.'}
          </p>

          <div className="grid gap-3 border-y border-white/10 py-4 text-sm">
            <PreviewRow icon={<CalendarDays size={15} />} text={when} />
            <PreviewRow icon={<MapPin size={15} />} text={place} />
            <PreviewRow
              icon={<Ticket size={15} />}
              text={
                tickets.length
                  ? `${tickets.length} tier${tickets.length === 1 ? '' : 's'} · ${capacity || '∞'} seats · from ${money(minPrice)}`
                  : 'No tickets added yet'
              }
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider text-white/55">
            <Chip>{guests.length} guests</Chip>
            <Chip>{handlers.length} team</Chip>
            <Chip>{coupons.length} offers</Chip>
          </div>
        </div>
      </div>

      {/* Tip card */}
      <div className="flex items-start gap-3 border border-ink/10 bg-white p-4 text-xs text-ink/60">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-coral" />
        <p>
          Live preview — what you enter on the left is what attendees will see.
        </p>
      </div>
    </aside>
  );
}

function PreviewRow({ icon, text }) {
  return (
    <p className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-butter">{icon}</span>
      <span>{text}</span>
    </p>
  );
}

function Chip({ children }) {
  return (
    <span className="bg-white/10 px-2.5 py-1">{children}</span>
  );
}
