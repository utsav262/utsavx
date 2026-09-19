import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bell, Plus, RefreshCw, Search } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrapList } from '../../lib/unwrap.js';
import { useToast } from '../../components/ui/Toast.jsx';
import DashboardEventCard from './DashboardEventCard.jsx';
import { dashboardNavPayload, matchesSearch } from './dashboardUtils.js';
import SellTicketsModal from '../sell/SellTicketsModal.jsx';
import { sellEntryMode } from '../sell/sellUtils.js';

const TABS = [
    { id: 'live', label: 'Live' },
    { id: 'past', label: 'Past' },
    { id: 'draft', label: 'Draft' }
];

const emptyTab = () => ({
    items: [],
    page: 1,
    hasMore: false,
    loading: false,
    error: ''
});

export default function DashboardScreen() {
    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();
    const toast = useToast();
    const [tab, setTab] = useState('live');
    const [query, setQuery] = useState('');
    const [pendingInvites, setPendingInvites] = useState(0);
    const [sellEvent, setSellEvent] = useState(null);
    const [tabs, setTabs] = useState({
        live: emptyTab(),
        past: emptyTab(),
        draft: emptyTab()
    });

    const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';
    const isScannerOnly = Boolean(user?.staffRole === 'Event_Scanner' && user?.role === 'customer');

    const loadTab = useCallback(async (type, { page = 1, append = false } = {}) => {
        setTabs((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                loading: true,
                error: ''
            }
        }));
        try {
            const response = await apiClient.eventsByType({
                event_type: type,
                page,
                length: 12
            });
            const rows = unwrapList(response);
            const pagination = response.data?.pagination || {};
            setTabs((prev) => ({
                ...prev,
                [type]: {
                    items: append ? [...prev[type].items, ...rows] : rows,
                    page,
                    hasMore: Boolean(pagination.has_next_page),
                    loading: false,
                    error: ''
                }
            }));
            return rows;
        } catch (failure) {
            setTabs((prev) => ({
                ...prev,
                [type]: {
                    ...prev[type],
                    loading: false,
                    error: failure.response?.data?.message || 'Could not load events.'
                }
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

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    const active = tabs[tab];
    const visible = useMemo(
        () => (active.items || []).filter((event) => matchesSearch(event, query)),
        [active.items, query]
    );

    const openDashboard = (event) => {
        const payload = dashboardNavPayload(event, tab);
        navigate(`/dashboard/events/${payload.eventId}`, { state: payload });
    };

    const openScan = (event) => {
        const payload = dashboardNavPayload(event, tab);
        navigate(`/dashboard/events/${payload.eventId}`, {
            state: { ...payload, focus: 'checkin' }
        });
    };

    const startSellFlow = (event, mode) => {
        navigate(`/dashboard/sell/${event._id || event.id}`, {
            state: {
                mode,
                eventItem: event,
                name: event.title || event.name
            }
        });
    };

    const openSell = (event) => {
        const entry = sellEntryMode(event);
        if (!entry) {
            toast.error('Sell is not available for this role.');
            return;
        }
        if (entry === 'modal') {
            setSellEvent(event);
            return;
        }
        startSellFlow(event, entry === 'gate' ? 'gate' : 'digital');
    };

    const openEdit = (event) => {
        navigate('/manager', { state: { view: 'create', eventId: event._id || event.id } });
    };

    return (
        <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
            <div className="flex flex-col justify-between gap-5 border-b border-ink/15 pb-8 md:flex-row md:items-end">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral">Dashboard</p>
                    <h1 className="serif mt-2 text-5xl sm:text-6xl">Your events</h1>
                    <p className="mt-3 max-w-xl text-sm text-ink/60">
                        Home list for Live, Past, and Draft. Open an event to enter its role-based dashboard.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            loadTab(tab);
                            loadInvites();
                        }}
                        className="inline-flex items-center gap-2 border border-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-wider"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <Link
                        to="/invitations"
                        className="relative inline-flex items-center gap-2 border border-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-wider"
                    >
                        <Bell size={14} /> Requests
                        {pendingInvites > 0 ? (
                            <span className="absolute -right-1 -top-1 min-w-[1.25rem] bg-coral px-1.5 py-0.5 text-center text-[10px] text-white">
                                {pendingInvites}
                            </span>
                        ) : null}
                    </Link>
                    {isOrganizer ? (
                        <button
                            type="button"
                            onClick={() => navigate('/manager', { state: { view: 'create' } })}
                            className="inline-flex items-center gap-2 bg-coral px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                        >
                            <Plus size={14} /> Create event
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name, venue, city, role…"
                        className="w-full border border-ink/15 bg-transparent py-3 pl-10 pr-4 text-sm outline-none focus:border-ink/35"
                    />
                </div>
                <nav className="flex gap-1 border-b border-ink/10" aria-label="Event tabs">
                    {TABS.map((item) => {
                        const count = tabs[item.id].items.length;
                        const activeTab = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id)}
                                className={`border-b-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider ${
                                    activeTab
                                        ? 'border-coral text-ink'
                                        : 'border-transparent text-ink/45 hover:text-ink/70'
                                }`}
                            >
                                {item.label}
                                <span className="ml-2 text-ink/35">{count}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {active.error ? (
                <div className="mt-6 border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">{active.error}</div>
            ) : null}

            {active.loading && !active.items.length ? (
                <p className="mt-10 text-sm text-ink/50">Loading {tab} events…</p>
            ) : null}

            {!active.loading && !visible.length ? (
                <div className="mt-10 border border-dashed border-ink/20 px-6 py-16 text-center">
                    <p className="serif text-3xl">No {tab} events</p>
                    <p className="mx-auto mt-3 max-w-md text-sm text-ink/55">
                        {tab === 'draft'
                            ? isOrganizer
                                ? 'Create a draft event to get started.'
                                : 'Drafts appear here after an organizer invites you or creates an event.'
                            : tab === 'live'
                                ? isScannerOnly
                                    ? 'Accept a team invite and the event will show here on Live.'
                                    : 'Published events you own or joined as staff appear here.'
                                : 'Past events will collect here after they end.'}
                    </p>
                    {tab === 'draft' && isOrganizer ? (
                        <button
                            type="button"
                            onClick={() => navigate('/manager', { state: { view: 'create' } })}
                            className="mt-6 inline-flex items-center gap-2 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                        >
                            <Plus size={14} /> Create event
                        </button>
                    ) : null}
                    {pendingInvites > 0 ? (
                        <Link
                            to="/invitations"
                            className="mt-6 inline-flex items-center gap-2 bg-coral px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                        >
                            Review {pendingInvites} request{pendingInvites === 1 ? '' : 's'}
                        </Link>
                    ) : null}
                </div>
            ) : null}

            {visible.length ? (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {visible.map((event) => (
                        <DashboardEventCard
                            key={event._id || event.id}
                            event={event}
                            tab={tab}
                            onDashboard={openDashboard}
                            onScan={openScan}
                            onSell={openSell}
                            onEdit={openEdit}
                        />
                    ))}
                </div>
            ) : null}

            {active.hasMore ? (
                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        disabled={active.loading}
                        onClick={() => loadTab(tab, { page: active.page + 1, append: true })}
                        className="border border-ink/15 px-5 py-3 text-xs font-extrabold uppercase tracking-wider disabled:opacity-60"
                    >
                        {active.loading ? 'Loading…' : 'Load more'}
                    </button>
                </div>
            ) : null}

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
