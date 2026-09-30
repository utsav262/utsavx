import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Bell, Plus, RefreshCw, Search, Calendar, Ticket, Clock,
  LayoutGrid, List, X, ChevronDown, Sparkles, ArrowRight,
  AlertCircle, TrendingUp
} from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrapList } from '../../lib/unwrap.js';
import { useToast } from '../../components/ui/Toast.jsx';
import DashboardEventCard from './DashboardEventCard.jsx';
import {
  canManageEvent,
  canScan,
  canSell,
  dashboardNavPayload,
  eventRole,
  isUserEmailVerified,
  matchesSearch,
} from './dashboardUtils.js';
import SellTicketsModal from '../sell/SellTicketsModal.jsx';
import { isGateWindowOpen, sellEntryMode } from '../sell/sellUtils.js';

const TABS = [
  { id: 'live', label: 'Live', icon: Sparkles, accent: 'coral' },
  { id: 'past', label: 'Past', icon: Clock, accent: 'ink' },
  { id: 'draft', label: 'Draft', icon: Calendar, accent: 'amber' },
];

const SORTS = [
  { value: 'recent', label: 'Recently updated' },
  { value: 'date', label: 'Event date' },
  { value: 'sales', label: 'Sales' },
];

const emptyTab = () => ({
  items: [],
  page: 1,
  hasMore: false,
  loading: false,
  error: '',
});

export default function DashboardScreen() {
  const user = useSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState('live');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [layout, setLayout] = useState('grid');
  const [pendingInvites, setPendingInvites] = useState(0);
  const [sellEvent, setSellEvent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tabs, setTabs] = useState({
    live: emptyTab(),
    past: emptyTab(),
    draft: emptyTab(),
  });

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
  const isScannerOnly = Boolean(user?.staffRole === 'Event_Scanner' && user?.role === 'customer');
  const emailVerified = isUserEmailVerified(user);

  /* ---------------- loaders ---------------- */
  const loadTab = useCallback(async (type, { page = 1, append = false } = {}) => {
    setTabs((prev) => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: '' },
    }));
    try {
      const response = await apiClient.eventsByType({ event_type: type, page, length: 12 });
      const rows = unwrapList(response);
      const pagination = response.data?.pagination || {};
      setTabs((prev) => ({
        ...prev,
        [type]: {
          items: append ? [...prev[type].items, ...rows] : rows,
          page,
          hasMore: Boolean(pagination.has_next_page),
          loading: false,
          error: '',
        },
      }));
      return rows;
    } catch (failure) {
      setTabs((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          loading: false,
          error: failure.response?.data?.message || 'Could not load events.',
        },
      }));
      return [];
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const response = await apiClient.myInvitations({ status: 'P' });
      setPendingInvites(unwrapList(response).length);
    } catch {
      setPendingInvites(0);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    const live = await loadTab('live');
    if (!live.length) {
      await Promise.all([loadTab('past'), loadTab('draft')]);
    } else {
      loadTab('past');
      loadTab('draft');
    }
    loadInvites();
  }, [loadTab, loadInvites]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([loadTab(tab), loadInvites()]);
    setRefreshing(false);
    toast.success('Refreshed');
  };

  /* ---------------- derived ---------------- */
  // Drafts + create are Owner/Manager only; pure staff accounts never see them.
  const canCreate = isOrganizer;
  const showDrafts = useMemo(
    () => canCreate || [...tabs.live.items, ...tabs.past.items].some(canManageEvent),
    [canCreate, tabs.live.items, tabs.past.items]
  );
  const visibleTabs = showDrafts ? TABS : TABS.filter((t) => t.id !== 'draft');

  useEffect(() => {
    if (tab === 'draft' && !showDrafts) setTab('live');
  }, [tab, showDrafts]);

  const active = tabs[tab];

  const visible = useMemo(() => {
    let rows = (active.items || []).filter((event) => matchesSearch(event, query));

    if (sort === 'date') {
      rows = [...rows].sort((a, b) => {
        const av = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
        const bv = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
        return av - bv;
      });
    } else if (sort === 'sales') {
      const sold = (e) =>
        (e.ticketTypes || []).reduce((s, t) => s + Number(t.sold || 0), 0);
      rows = [...rows].sort((a, b) => sold(b) - sold(a));
    }
    return rows;
  }, [active.items, query, sort]);

  const totalCount = useMemo(
    () => tabs.live.items.length + tabs.past.items.length + tabs.draft.items.length,
    [tabs]
  );

  const liveCount = tabs.live.items.length;

  /* ---------------- actions ---------------- */
  const openDashboard = (event) => {
    const payload = dashboardNavPayload(event, tab);
    navigate(`/dashboard/events/${payload.eventId}`, {
      // Gate staff only ever get the check-in view.
      state: { ...payload, scannerCheckInView: eventRole(event) === 'scanner' },
    });
  };

  const requireVerified = () => {
    if (emailVerified) return true;
    toast.error('Verify your email to continue.');
    return false;
  };

  const openScan = (event) => {
    if (!requireVerified()) return;
    if (!canScan(event)) {
      toast.error('You do not have permission to scan tickets for this event.');
      return;
    }
    const payload = dashboardNavPayload(event, tab);
    navigate(`/dashboard/events/${payload.eventId}`, {
      state: { ...payload, focus: 'checkin' },
    });
  };

  const startSellFlow = (event, mode) => {
    if (mode === 'gate' && !isGateWindowOpen(event)) {
      toast.error('Gate tickets can be sold starting 1 day before the event.');
      return;
    }
    if (mode === 'complimentary' && !canManageEvent(event)) {
      toast.error('You do not have permission to sell tickets for this event.');
      return;
    }
    navigate(`/dashboard/sell/${event._id || event.id}`, {
      state: { mode, eventItem: event, name: event.title || event.name },
    });
  };

  const openSell = (event) => {
    if (!requireVerified()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.error('Connect to sell tickets.');
      return;
    }
    const entry = canSell(event) ? sellEntryMode(event) : null;
    if (!entry) {
      toast.error('You do not have permission to sell tickets for this event.');
      return;
    }
    if (entry === 'modal') {
      setSellEvent(event);
      return;
    }
    startSellFlow(event, entry === 'gate' ? 'gate' : 'digital');
  };

  const createEvent = () => {
    if (!canCreate) return;
    if (!requireVerified()) return;
    navigate('/manager', { state: { view: 'create' } });
  };

  const openEdit = (event) => {
    if (!canManageEvent(event)) {
      toast.error('You do not have permission to edit this event.');
      return;
    }
    navigate('/manager', { state: { view: 'create', eventId: event._id || event.id } });
  };

  /* ---------------- render ---------------- */
  return (
    <main className="bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">
              Dashboard
            </p>
            <h1 className="serif mt-1 text-4xl leading-tight sm:text-5xl">
              Your events
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink/55">
              Live, past and draft events in one place. Open an event to reach
              the dashboard for your role.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAll}
              disabled={refreshing}
              className="inline-flex items-center gap-2 border border-ink/15 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition hover:border-coral hover:text-coral disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>

            <Link
              to="/invitations"
              className="relative inline-flex items-center gap-2 border border-ink/15 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition hover:border-coral hover:text-coral"
            >
              <Bell size={14} />
              Requests
              {pendingInvites > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center bg-coral px-1 text-[10px] font-extrabold text-white">
                  {pendingInvites > 9 ? '9+' : pendingInvites}
                </span>
              )}
            </Link>

            {canCreate && (
              <button
                type="button"
                onClick={createEvent}
                className="inline-flex items-center gap-2 bg-coral px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white transition hover:opacity-90"
              >
                <Plus size={14} /> Create event
              </button>
            )}
          </div>
        </div>

        {/* ================= STATS STRIP ================= */}
        {totalCount > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              icon={<LayoutGrid size={16} />}
              label="Total events"
              value={totalCount}
              tone="ink"
            />
            <MiniStat
              icon={<Sparkles size={16} />}
              label="Live now"
              value={liveCount}
              tone="coral"
            />
            <MiniStat
              icon={<Clock size={16} />}
              label="Past events"
              value={tabs.past.items.length}
              tone="amber"
            />
            <MiniStat
              icon={<Ticket size={16} />}
              label="Drafts"
              value={tabs.draft.items.length}
              tone="moss"
            />
          </div>
        )}

        {/* ================= TOOLBAR ================= */}
        <div className="mt-8 border border-ink/10 bg-white p-4">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-4">
            {visibleTabs.map((t) => {
              const count = tabs[t.id].items.length;
              const isActive = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-ink text-white'
                      : 'border border-ink/15 text-ink/60 hover:border-ink/30 hover:text-ink'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-white' : 'text-coral'} />
                  {t.label}
                  <span
                    className={`px-1.5 text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20' : 'bg-ink/5 text-ink/60'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + sort + layout */}
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2 border border-ink/15 bg-cream/40 px-3.5 py-2.5 focus-within:border-coral">
              <Search size={15} className="text-ink/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, venue, city, role…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-0.5 text-ink/40 hover:text-ink"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none border border-ink/15 bg-white px-3.5 py-2.5 pr-9 text-xs font-bold text-ink/70 outline-none focus:border-coral"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                />
              </div>

              {/* Layout toggle */}
              <div className="inline-flex overflow-hidden border border-ink/15">
                <button
                  onClick={() => setLayout('grid')}
                  className={`p-2.5 transition ${
                    layout === 'grid' ? 'bg-ink text-white' : 'bg-white text-ink/50 hover:text-ink'
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setLayout('list')}
                  className={`border-l border-ink/15 p-2.5 transition ${
                    layout === 'list' ? 'bg-ink text-white' : 'bg-white text-ink/50 hover:text-ink'
                  }`}
                  aria-label="List view"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= ERROR ================= */}
        {active.error && (
          <div className="mt-6 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-bold text-red-700">Couldn't load events</p>
              <p className="text-red-600">{active.error}</p>
            </div>
            <button
              onClick={() => loadTab(tab)}
              className="bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* ================= LOADING ================= */}
        {active.loading && !active.items.length && (
          <div className={`mt-8 grid gap-6 ${
            layout === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'
          }`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} layout={layout} />
            ))}
          </div>
        )}

        {/* ================= EMPTY ================= */}
        {!active.loading && !visible.length && !active.error && (
          <EmptyState
            tab={tab}
            query={query}
            isOrganizer={isOrganizer}
            isScannerOnly={isScannerOnly}
            pendingInvites={pendingInvites}
            onCreate={createEvent}
            onClearSearch={() => setQuery('')}
          />
        )}

        {/* ================= RESULTS ================= */}
        {visible.length > 0 && (
          <>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs font-bold text-ink/50">
                {visible.length} event{visible.length === 1 ? '' : 's'}
                {query && (
                  <>
                    {' '}for "<span className="text-ink">{query}</span>"
                  </>
                )}
              </p>
            </div>

            <div className={`mt-4 ${
              layout === 'grid'
                ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-3'
            }`}>
              {visible.map((event) => (
                <DashboardEventCard
                  key={event._id || event.id}
                  event={event}
                  tab={tab}
                  layout={layout}
                  onDashboard={openDashboard}
                  onScan={openScan}
                  onSell={user?.role === 'admin' ? undefined : openSell}
                  onEdit={openEdit}
                />
              ))}
            </div>
          </>
        )}

        {/* ================= LOAD MORE ================= */}
        {active.hasMore && (
          <div className="mt-10 text-center">
            <button
              type="button"
              disabled={active.loading}
              onClick={() => loadTab(tab, { page: active.page + 1, append: true })}
              className="inline-flex items-center gap-2 border border-ink/20 bg-white px-6 py-3 text-sm font-extrabold transition hover:border-coral hover:text-coral disabled:opacity-60"
            >
              {active.loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-coral" />
                  Loading…
                </>
              ) : (
                <>
                  Load more events <ArrowRight size={14} />
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-ink/45">
              Showing {active.items.length} of {active.items.length + (active.hasMore ? '…' : 0)}
            </p>
          </div>
        )}
      </div>

      {/* Sell modal */}
      <SellTicketsModal
        event={sellEvent}
        open={Boolean(sellEvent)}
        onClose={() => setSellEvent(null)}
        onSelect={(mode) => {
          const event = sellEvent;
          setSellEvent(null);
          if (event) startSellFlow(event, mode);
        }}
      />
    </main>
  );
}

/* ================= Small components ================= */
function MiniStat({ icon, label, value, tone = 'ink' }) {
  const toneMap = {
    ink: 'bg-ink/5 text-ink',
    coral: 'bg-coral/10 text-coral',
    amber: 'bg-amber-100 text-amber-700',
    moss: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className="flex items-center gap-3 border border-ink/10 bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center ${toneMap[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">
          {label}
        </p>
        <p className="serif text-2xl leading-none">{value}</p>
      </div>
    </div>
  );
}

function SkeletonCard({ layout }) {
  if (layout === 'list') {
    return (
      <div className="flex animate-pulse gap-4 border border-ink/10 bg-white p-4">
        <div className="h-24 w-32 shrink-0 bg-ink/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/4 bg-ink/10" />
          <div className="h-4 w-3/4 bg-ink/10" />
          <div className="h-3 w-1/2 bg-ink/10" />
        </div>
      </div>
    );
  }
  return (
    <div className="animate-pulse overflow-hidden border border-ink/10 bg-white">
      <div className="aspect-[16/10] w-full bg-ink/10" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 bg-ink/10" />
        <div className="h-4 w-3/4 bg-ink/10" />
        <div className="h-3 w-1/2 bg-ink/10" />
      </div>
    </div>
  );
}

function EmptyState({ tab, query, isOrganizer, isScannerOnly, pendingInvites, onCreate, onClearSearch }) {
  if (query) {
    return (
      <div className="mt-10 border border-dashed border-ink/15 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ink/5">
          <Search className="h-6 w-6 text-ink/40" />
        </div>
        <h3 className="serif mt-5 text-3xl">No matches</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          No events match "{query}". Try clearing your filters.
        </p>
        <button
          onClick={onClearSearch}
          className="mt-6 inline-flex items-center gap-2 bg-coral px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <X size={14} /> Clear search
        </button>
      </div>
    );
  }

  const copyMap = {
    draft: isOrganizer
      ? { title: 'No drafts yet', body: 'Create an event and save it as a draft.' }
      : { title: 'No drafts', body: 'Drafts appear here for events you own or manage.' },
    live: isScannerOnly
      ? { title: 'No live events', body: 'Accept a team invite and the event will show up here.' }
      : { title: 'No live events', body: 'Publish an event or join one as staff and it will show up here.' },
    past: { title: 'No past events', body: 'Events move here once they have ended.' },
  };
  const copy = copyMap[tab];

  return (
    <div className="mt-10 border border-dashed border-ink/15 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
        <Calendar className="h-7 w-7 text-coral" />
      </div>
      <h3 className="serif mt-6 text-4xl">{copy.title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm text-ink/60">{copy.body}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {tab === 'draft' && isOrganizer && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 bg-coral px-6 py-3 text-sm font-extrabold text-white hover:opacity-90"
          >
            <Plus size={14} /> Create event
          </button>
        )}
        {pendingInvites > 0 && (
          <Link
            to="/invitations"
            className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-extrabold text-white hover:opacity-90"
          >
            <Bell size={14} /> Review {pendingInvites} request{pendingInvites === 1 ? '' : 's'}
          </Link>
        )}
        {!isOrganizer && pendingInvites === 0 && (
          <Link
            to="/events"
            className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3 text-sm font-extrabold hover:border-coral hover:text-coral"
          >
            Browse events <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </div>
  );
}