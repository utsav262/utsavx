import { CalendarDays, MapPin, MoreVertical, Edit3, Eye, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime } from '../../../lib/datetime.js';
import { money } from '../../../lib/money.js';
import { EVENT_PLACEHOLDER } from '../../../lib/placeholder.js';

function cover(event) {
  return (
    event.imageUrl ||
    event.image ||
    event.cover_image ||
    EVENT_PLACEHOLDER
  );
}

const STATUS_TONES = {
  live: 'bg-emerald-100 text-emerald-700',
  published: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-ink/10 text-ink/60',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  past: 'bg-ink/10 text-ink/60',
};

export default function EventTile({ event, active, onOpen, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sold = (event.ticketTypes || []).reduce((s, t) => s + Number(t.sold || 0), 0);
  const capacity = (event.ticketTypes || []).reduce((s, t) => s + Number(t.quantity || 0), 0);
  const prices = (event.ticketTypes || []).map((t) => Number(t.price)).filter((n) => !Number.isNaN(n));
  const from = prices.length ? Math.min(...prices) : Infinity;
  const status = (event.status || 'draft').toLowerCase();
  const pct = capacity ? Math.round((sold / capacity) * 100) : 0;

  return (
    <article
      className={`group relative overflow-hidden border bg-white transition ${
        active ? 'border-coral shadow-[0_12px_40px_rgba(232,93,76,0.12)]' : 'border-ink/10 hover:border-ink/25'
      }`}
    >
      {/* Cover */}
      <button type="button" onClick={() => onOpen(event)} className="block w-full text-left">
        <div className="relative aspect-[16/10] overflow-hidden bg-moss">
          <img src={cover(event)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
          <span className={`absolute left-3 top-3 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${STATUS_TONES[status] || STATUS_TONES.draft}`}>
            {status}
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-butter">
              {event.category || 'Event'}
            </p>
            <h3 className="serif mt-1 line-clamp-2 text-2xl leading-tight">{event.title}</h3>
          </div>
        </div>
      </button>

      {/* Menu */}
      <div className="absolute right-3 top-3">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="bg-white/90 p-1.5 text-ink backdrop-blur hover:bg-white"
          aria-label="Actions"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-40 overflow-hidden border border-ink/10 bg-white shadow-xl">
            <button onClick={() => { setMenuOpen(false); onOpen(event); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream">
              <Eye size={13} /> Open
            </button>
            {onEdit && (
              <button onClick={() => { setMenuOpen(false); onEdit(event); }} className="flex w-full items-center gap-2 border-t border-ink/10 px-3 py-2 text-left text-sm hover:bg-cream">
                <Edit3 size={13} /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => { setMenuOpen(false); onDelete(event); }} className="flex w-full items-center gap-2 border-t border-ink/10 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-3 p-4">
        <p className="flex items-center gap-2 text-sm text-ink/60">
          <CalendarDays size={14} className="text-coral" />
          {formatDateTime(event.startsAt) || 'Date TBA'}
        </p>
        <p className="flex items-center gap-2 text-sm text-ink/55">
          <MapPin size={14} className="text-coral" />
          {event.venue?.city || event.venue?.name || event.city || 'Venue TBA'}
        </p>

        {/* Sales bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-ink/55">
            <span>{sold}/{capacity || '—'} sold</span>
            <span className="text-coral">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden bg-ink/10">
            <div
              className="h-full bg-coral transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-ink/10 pt-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink/50">
            {Number.isFinite(from) ? `from ${money(from)}` : 'Free / TBA'}
          </span>
          <button
            type="button"
            onClick={() => onOpen(event)}
            className="text-xs font-extrabold uppercase tracking-wider text-coral hover:underline"
          >
            Open →
          </button>
        </div>
      </div>
    </article>
  );
}
