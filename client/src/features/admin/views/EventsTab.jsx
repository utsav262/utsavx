import { useMemo, useState } from 'react';
import { Search, Star, Filter } from 'lucide-react';
import EventStatusMenu from '../components/EventStatusMenu.jsx';
import { formatDateTime } from '../../../lib/datetime.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'review_pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'sold-out', label: 'Sold out' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'featured', label: 'Featured' },
];

const STATUS_TONES = {
  published: 'bg-emerald-100 text-emerald-700',
  live: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-ink/10 text-ink/60',
  review_pending: 'bg-amber-100 text-amber-700',
  'sold-out': 'bg-ink/10 text-ink/60',
  cancelled: 'bg-red-100 text-red-600',
};

export default function EventsTab({ events = [], selected, onOpen, onSetStatus, onToggleFeatured }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let rows = events;
    if (filter === 'featured') rows = rows.filter((e) => e.featured);
    else if (filter !== 'all') rows = rows.filter((e) => e.status === filter);

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((e) =>
        `${e.title || ''} ${e.venue?.city || ''} ${e.organizer?.name || ''} ${e.organizer?.email || ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [events, filter, query]);

  return (
    <div className="mt-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 border border-ink/15 bg-white px-3.5 py-2.5">
          <Search size={15} className="text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events by title, city, or host"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition ${
              filter === f.value
                ? 'bg-ink text-white'
                : 'border border-ink/15 text-ink/60 hover:border-ink/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-ink/10 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Filter className="mx-auto h-8 w-8 text-ink/30" />
            <p className="mt-3 text-sm text-ink/55">
              {query ? `No events match "${query}"` : 'No events in this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-ink/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Event
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Host
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Starts
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Featured
                  </th>
                  <th className="w-px px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => {
                  const status = event.status || 'draft';
                  const tone = STATUS_TONES[status] || STATUS_TONES.draft;
                  return (
                    <tr
                      key={event._id}
                      className={`border-t border-ink/10 transition ${
                        selected?._id === event._id ? 'bg-coral/5' : 'hover:bg-cream/50'
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => onOpen(event)}
                          className="text-left font-bold hover:text-coral"
                        >
                          {event.title}
                        </button>
                        <p className="mt-0.5 text-xs text-ink/45">
                          {event.venue?.city || '—'} · {event.category || 'Event'}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-ink/65">
                        {event.organizer?.name || event.organizer?.email || '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-ink/55">
                        {formatDateTime(event.startsAt) || '—'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-block px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${tone}`}>
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          onClick={() => onToggleFeatured(event._id, !event.featured)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                            event.featured
                              ? 'bg-amber-100 text-amber-700'
                              : 'border border-ink/15 text-ink/50'
                          }`}
                        >
                          <Star size={10} className={event.featured ? 'fill-amber-600' : ''} />
                          {event.featured ? 'Featured' : 'Feature'}
                        </button>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <EventStatusMenu
                          event={event}
                          onSetStatus={onSetStatus}
                          onToggleFeatured={onToggleFeatured}
                          onOpen={onOpen}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-ink/45">
        Showing {filtered.length} of {events.length} events
      </p>
    </div>
  );
}
