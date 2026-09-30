import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, SlidersHorizontal, Sparkles, MapPin, Calendar, TrendingUp, Filter } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { useCategories } from '../lib/useCategories.js';
import EventCard from '../components/events/EventCard.jsx';

const EVENT_TYPES = ['All', 'This Weekend', 'Next Weekend', 'This Month'];
const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date_asc', label: 'Date · soonest' },
  { value: 'price_asc', label: 'Price · low to high' },
  { value: 'price_desc', label: 'Price · high to low' },
  { value: 'popular', label: 'Most popular' },
];

export default function Events() {
  const [params] = useSearchParams();
  const catalog = useCategories();
  const categories = useMemo(() => ['All events', ...catalog.map((c) => c.name)], [catalog]);
  const [term, setTerm] = useState(params.get('q') || '');
  // ?category= may be a name ("Music") or slug ("food-drink"); resolved once categories load.
  const [category, setCategory] = useState('All events');
  useEffect(() => {
    const wanted = (params.get('category') || '').toLowerCase();
    if (!wanted || !catalog.length) return;
    const hit = catalog.find((c) => c.slug === wanted || c.name.toLowerCase() === wanted);
    if (hit) setCategory(hit.name);
  }, [params, catalog]);
  const [eventType, setEventType] = useState('All');
  const [sort, setSort] = useState('relevance');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Reset page on any filter change
  useEffect(() => {
    setPage(1);
  }, [term, category, eventType, sort]);

  // Fetch
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      apiClient
        .events(
          {
            search: term || undefined,
            category: category === 'All events' ? undefined : category,
            eventType: eventType === 'All' ? undefined : eventType,
            sort,
            page,
            length: 9,
          },
          { signal: controller.signal }
        )
        .then((response) => {
          const result = unwrap(response);
          const rows = Array.isArray(result) ? result : [];
          setOffline(false);
          setItems((curr) => (page === 1 ? rows : [...curr, ...rows]));
          setHasMore(Boolean(response.data?.pagination?.has_next_page));
          setTotal(Number(response.data?.pagination?.total || rows.length));
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setOffline(true);
          setError('offline');

          setItems([]);
          setTotal(0);
          setHasMore(false);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, category, eventType, sort, page]);

  const hasActiveFilters =
    term || category !== 'All events' || eventType !== 'All' || sort !== 'relevance';

  const clearAll = () => {
    setTerm('');
    setCategory('All events');
    setEventType('All');
    setSort('relevance');
  };

  /* ------------------------------ Render ------------------------------ */
  return (
    <main className="bg-cream">
      {/* ================= HERO ================= */}
      <section className="border-b border-ink/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">
            Discover
          </p>
          <h1 className="serif mt-2 text-5xl leading-none sm:text-6xl">
            What's on near you
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink/60">
            Search by name or city, pick a category, and book in a couple of taps with UPI or card.
          </p>

          {/* Quick category chips (mobile only — desktop has them in the filter bar) */}
          <div className="mt-6 flex flex-wrap gap-2 sm:hidden">
            {categories.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 text-xs font-bold transition ${
                  category === c
                    ? 'bg-coral text-white'
                    : 'border border-ink/15 text-ink/70 hover:border-coral hover:text-coral'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STICKY FILTER BAR ================= */}
      <div className="sticky top-[var(--app-header,69px)] z-30 border-b border-ink/10 bg-cream/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-5 py-3 lg:px-8">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex flex-1 items-center border border-ink/15 bg-white px-4 py-2.5 transition focus-within:border-coral">
              <Search size={16} className="text-ink/45" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
                placeholder="Search events, places, vibes"
                aria-label="Search events"
              />
              {term && (
                <button
                  onClick={() => setTerm('')}
                  className="p-1 text-ink/40 hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort (desktop) */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hidden border border-ink/15 bg-white px-4 py-2.5 text-sm font-bold text-ink/70 outline-none focus:border-coral sm:block"
              aria-label="Sort events"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Filter toggle (mobile) */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative inline-flex items-center gap-1.5 border px-4 py-2.5 text-sm font-bold transition sm:hidden ${
                hasActiveFilters
                  ? 'border-coral bg-coral text-white'
                  : 'border-ink/15 bg-white text-ink/70'
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={15} />
              Filters
              {hasActiveFilters && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-coral">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Desktop filters row */}
          <div className="mt-3 hidden items-center gap-2 sm:flex">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={`px-3.5 py-1.5 text-xs font-bold transition ${
                  eventType === t
                    ? 'bg-ink text-white'
                    : 'border border-ink/15 text-ink/70 hover:border-ink/40'
                }`}
              >
                {t}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-ink/15" />
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3.5 py-1.5 text-xs font-bold transition ${
                  category === c
                    ? 'bg-coral text-white'
                    : 'border border-ink/15 text-ink/70 hover:border-coral hover:text-coral'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Mobile filters drawer */}
          {showFilters && (
            <div className="mt-3 space-y-3 border border-ink/10 bg-white p-4 sm:hidden">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">
                  When
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EVENT_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setEventType(t)}
                      className={`px-3 py-1.5 text-xs font-bold ${
                        eventType === t
                          ? 'bg-ink text-white'
                          : 'border border-ink/15'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">
                  Category
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 text-xs font-bold ${
                        category === c
                          ? 'bg-coral text-white'
                          : 'border border-ink/15'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">
                  Sort
                </p>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-2 text-sm font-bold"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= RESULTS ================= */}
      <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        {/* Result bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink/60">
            {loading && page === 1 ? (
              'Searching…'
            ) : total > 0 ? (
              <>
                <b className="text-ink">{total}</b>{' '}
                {total === 1 ? 'event' : 'events'} found
                {term && (
                  <>
                    {' '}
                    for "<b className="text-ink">{term}</b>"
                  </>
                )}
              </>
            ) : (
              'No results'
            )}
          </p>

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-coral hover:underline"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>

        {/* Offline notice */}
        {offline && (
          <div className="mb-6 flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm">
            <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            <p className="text-amber-800">
              We couldn't load events right now. Check your connection and try again in a moment.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && page === 1 ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length ? (
          <>
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((event) => (
                <EventCard
                  key={event.slug || event.id || event._id}
                  event={event}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-14 text-center">
                <button
                  disabled={loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-2 border border-ink/20 bg-white px-6 py-3 text-sm font-extrabold transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-coral" />
                      Loading…
                    </>
                  ) : (
                    <>Load more events</>
                  )}
                </button>
                <p className="mt-2 text-xs text-ink/45">
                  Showing {items.length} of {total}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="border border-ink/10 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral/10">
              <Search className="h-6 w-6 text-coral" />
            </div>
            <h2 className="serif mt-5 text-3xl">No events found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
              {term
                ? `No events match "${term}". Try changing your filters.`
                : 'No events in this category yet. Clear your filters and try again.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={clearAll}
                className="bg-coral px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                Clear all filters
              </button>
              <button
                onClick={() => setCategory('All events')}
                className="border border-ink/20 px-5 py-2.5 text-sm font-bold hover:border-coral hover:text-coral"
              >
                Browse all categories
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* --------------------------- Skeleton Card --------------------------- */
function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] w-full bg-ink/10" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-1/3 bg-ink/10" />
        <div className="h-4 w-3/4 bg-ink/10" />
        <div className="h-3 w-1/2 bg-ink/10" />
      </div>
    </div>
  );
}