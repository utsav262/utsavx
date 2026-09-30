import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BarChart3, Coins, ExternalLink, Pencil, Ticket } from 'lucide-react';
import { PageHeader, PageShell, buttonCls } from '../../components/ui/Page.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import { money } from '../../lib/money.js';
import EventOverviewTab from './EventOverviewTab.jsx';
import StaffEventDashboard from '../staff/StaffEventDashboard.jsx';
import StaffCheckIn from '../staff/StaffCheckIn.jsx';
import {
    canEditEvent,
    canScan,
    eventRole,
    isAmbassadorLike,
    isEventInPast,
    isOwnerLike,
    isScannerLike,
    roleBadge
} from './dashboardUtils.js';

const OWNER_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'sales', label: 'Sales' },
    { id: 'checkins', label: 'Check-ins' },
    { id: 'payout', label: 'Payout' }
];

function Stat({ label, value, Icon }) {
    return (
        <div className="border border-ink/10 bg-cream p-5">
            <Icon size={16} className="text-coral" />
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/45">{label}</p>
            <p className="serif mt-1 text-3xl leading-none">{value}</p>
        </div>
    );
}

function SalesPanel({ event, orders, overview }) {
    const rows = Array.isArray(orders?.table_data) ? orders.table_data : [];
    return (
        <section className="space-y-6">
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Sales</p>
                <h2 className="serif mt-2 text-4xl">{event?.title || 'Event'}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Gross sales" value={money(orders?.gross_sales ?? overview?.gross_sales)} Icon={Coins} />
                <Stat label="Tickets sold" value={orders?.total_sold ?? overview?.tickets_sold ?? 0} Icon={Ticket} />
                <Stat label="Sold %" value={`${overview?.sold_percent ?? 0}%`} Icon={BarChart3} />
            </div>
            <div className="overflow-x-auto border-y border-ink/15">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr>
                            {['ticket_type', 'confirmation_id', 'payment_status', 'price_paid'].map((column) => (
                                <th key={column} className="px-3 py-3 text-[10px] uppercase tracking-wider text-ink/50">
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.confirmation_id || index} className="border-t border-ink/10">
                                <td className="px-3 py-3">{row.ticket_type || '—'}</td>
                                <td className="px-3 py-3 font-mono text-xs">{row.confirmation_id || '—'}</td>
                                <td className="px-3 py-3">{row.payment_status || '—'}</td>
                                <td className="px-3 py-3">{money(row.price_paid)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!rows.length ? <p className="px-3 py-8 text-sm text-ink/50">No sales yet.</p> : null}
            </div>
        </section>
    );
}

function PayoutPanel({ event, payouts, orders }) {
    return (
        <section className="space-y-6">
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Payout</p>
                <h2 className="serif mt-2 text-4xl">{event?.title || 'Event'}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Gross" value={money(payouts?.gross ?? orders?.gross_sales)} Icon={Coins} />
                <Stat label="Fees" value={money(payouts?.fees ?? orders?.fees)} Icon={BarChart3} />
                <Stat label="Payout due" value={money(payouts?.payout_due ?? orders?.payout_due)} Icon={Ticket} />
            </div>
            <div className="border border-ink/10 bg-white p-5 text-sm text-ink/60">
                Remitted: {money(payouts?.remitted || 0)} · Pending: {money(payouts?.pending ?? payouts?.payout_due ?? 0)}
            </div>
        </section>
    );
}

function EarningsPanel({ event, overview, payouts, orders }) {
    const rows = Array.isArray(overview?.ticket_types) ? overview.ticket_types : [];
    return (
        <section className="space-y-6">
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Earnings</p>
                <h2 className="serif mt-2 text-4xl">{event?.title || 'Event'}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Gross" value={money(payouts?.gross ?? orders?.gross_sales)} Icon={Coins} />
                <Stat label="Tickets sold" value={overview?.tickets_sold ?? 0} Icon={Ticket} />
                <Stat label="Net earnings" value={money(payouts?.payout_due ?? 0)} Icon={BarChart3} />
            </div>
            <div className="border-y border-ink/15">
                {rows.map((row) => (
                    <div key={row.name} className="flex justify-between border-t border-ink/10 px-3 py-3 text-sm first:border-0">
                        <span>{row.name}</span>
                        <span className="text-ink/60">{row.sold}/{row.available} sold</span>
                    </div>
                ))}
                {!rows.length ? <p className="px-3 py-8 text-sm text-ink/50">No ticket types yet.</p> : null}
            </div>
        </section>
    );
}

/** "Live · Sat, 18 Oct 2026" style line above the event title. */
function eventEyebrow(event) {
    const status = { published: 'Live', 'sold-out': 'Sold out', review_pending: 'In review', draft: 'Draft', cancelled: 'Cancelled' }[event?.status] || 'Event';
    const when = event?.startsAt ? new Date(event.startsAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';
    return when ? `${status} · ${when}` : status;
}

function HubTabs({ active, onChange, tabs = OWNER_TABS }) {
    return (
        <nav className="sticky top-[var(--app-header,73px)] z-20 mb-6 border-b border-ink/10 bg-cream" aria-label="Event dashboard tabs">
            <div className="flex gap-1 overflow-x-auto">
                {tabs.map((item) => {
                    const selected = active === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onChange(item.id)}
                            className={`shrink-0 border-b-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition ${
                                selected
                                    ? 'border-coral text-ink'
                                    : 'border-transparent text-ink/45 hover:text-ink/70'
                            }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export default function EventDashboardPage() {
    const { eventId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const seed = location.state || {};
    const toast = useToast();

    const [eventItem, setEventItem] = useState(seed.eventItem || null);
    const [hubTab, setHubTab] = useState(seed.focus === 'checkin' ? 'checkins' : 'overview');
    const [ownerData, setOwnerData] = useState({
        orders: null,
        overview: null,
        checkIns: null,
        payouts: null,
        tickets: [],
        coupons: [],
        guests: [],
        handlers: []
    });
    const [staffData, setStaffData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const ownerLike = isOwnerLike(eventItem) && (user?.role === 'organizer' || user?.role === 'admin');
    const scannerLike = !ownerLike && (Boolean(seed.scannerCheckInView) || isScannerLike(eventItem));
    const ambassadorLike = !ownerLike && !scannerLike && isAmbassadorLike(eventItem);
    const isPast = isEventInPast(eventItem, seed.type);
    const canEdit = canEditEvent(eventItem, isPast);
    const eventTitle = eventItem?.title || eventItem?.name || seed.name || 'Event';

    const handleEdit = () => {
        if (eventRole(eventItem) !== 'owner') {
            toast.error('Only the event owner can edit this event.');
            return;
        }
        if (isPast) {
            toast.error('Past events cannot be edited.');
            return;
        }
        navigate('/manager', { state: { view: 'create', eventId } });
    };

    useEffect(() => {
        let cancelled = false;

        const resolveEventMeta = async () => {
            if (seed.eventItem) return seed.eventItem;
            // Manager accounts: look the event up directly (works for cancelled events and deep links too).
            if (user?.role === 'organizer' || user?.role === 'admin') {
                try {
                    const full = unwrap(await apiClient.managerEvent(eventId), null);
                    if (full && !Array.isArray(full)) {
                        const organizerId = full.organizer?._id || full.organizer;
                        const owns = user.role === 'admin' || String(organizerId) === String(user._id || user.id);
                        return {
                            ...full,
                            is_owner: owns,
                            event_handler_type: owns ? 'Owner' : 'Manager'
                        };
                    }
                } catch {
                    /* not theirs as owner/manager — fall back to the staff lookup below */
                }
            }
            for (const type of ['live', 'past', 'draft']) {
                try {
                    const response = await apiClient.eventsByType({ event_type: type, length: 50 });
                    const found = unwrapList(response).find(
                        (row) => String(row._id || row.id) === String(eventId)
                    );
                    if (found) return found;
                } catch {
                    /* try next */
                }
            }
            return { _id: eventId, id: eventId, title: seed.name || 'Event' };
        };

        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const meta = await resolveEventMeta();
                if (cancelled) return;
                setEventItem(meta);

                const asOwner =
                    (meta.is_owner || meta.event_handler_type === 'Owner' || meta.event_handler_type === 'Manager') &&
                    (user?.role === 'organizer' || user?.role === 'admin');

                if (asOwner) {
                    const [detail, orders, overview, checkIns, payouts, tickets, coupons, guests, handlers] =
                        await Promise.all([
                            apiClient.managerEvent(eventId),
                            apiClient.managerOrders(eventId, { type: 'transactions', length: 20 }),
                            apiClient.managerSalesOverview(eventId),
                            apiClient.managerCheckIns(eventId),
                            apiClient.managerPayouts(eventId),
                            apiClient.managerTickets(eventId),
                            apiClient.managerCoupons(eventId),
                            apiClient.managerGuests(eventId),
                            apiClient.managerHandlers(eventId)
                        ]);
                    if (cancelled) return;
                    const fullEvent = unwrap(detail, meta);
                    setEventItem({
                        ...meta,
                        ...(fullEvent && !Array.isArray(fullEvent) ? fullEvent : {}),
                        is_owner: true,
                        event_handler_type: meta.event_handler_type || 'Owner'
                    });
                    setOwnerData({
                        orders: unwrap(orders, null),
                        overview: unwrap(overview, null),
                        checkIns: unwrap(checkIns, null),
                        payouts: unwrap(payouts, null),
                        tickets: unwrapList(tickets),
                        coupons: unwrapList(coupons),
                        guests: unwrapList(guests),
                        handlers: unwrapList(handlers)
                    });
                } else {
                    const response = await apiClient.staffEventDashboard(eventId);
                    if (cancelled) return;
                    const payload = unwrap(response, null);
                    setStaffData(payload);
                    if (payload?.event) {
                        setEventItem((prev) => ({
                            ...prev,
                            ...payload.event,
                            event_handler_type:
                                payload.handler?.userType || prev?.event_handler_type || 'Event_Scanner',
                            scanner_permission:
                                payload.handler?.scannerPermission || prev?.scanner_permission
                        }));
                    }
                }
            } catch (failure) {
                if (!cancelled) {
                    setError(failure.response?.data?.message || 'Could not load event dashboard.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [eventId, user?.role]);

    useEffect(() => {
        if (seed.focus === 'checkin') setHubTab('checkins');
    }, [seed.focus]);

    useEffect(() => {
        if (!seed.refreshHandlers || !eventId) return;
        let cancelled = false;
        (async () => {
            try {
                const handlers = await apiClient.managerHandlers(eventId);
                if (cancelled) return;
                setOwnerData((prev) => ({ ...prev, handlers: unwrapList(handlers) }));
                setHubTab('overview');
                setNotice('Team invite sent. Lists refreshed.');
            } catch {
                /* ignore refresh errors */
            } finally {
                navigate(location.pathname, { replace: true, state: { ...seed, refreshHandlers: false, refreshTeamMemberType: null, refreshTeamMembersAt: null } });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [seed.refreshHandlers, eventId]);

    const goHome = () => navigate('/dashboard');

    const inviteForCheckIn = useMemo(() => {
        if (staffData?.handler) {
            return {
                ...staffData.handler,
                event: staffData.event || eventItem,
                permissions: staffData.permissions,
                canScan: staffData.permissions?.canCheckIn
            };
        }
        return {
            _id: eventItem?.event_handler_id,
            userType: eventItem?.event_handler_type || 'Event_Scanner',
            event: eventItem,
            canScan: canScan(eventItem),
            permissions: { canCheckIn: canScan(eventItem), canViewDashboard: true }
        };
    }, [staffData, eventItem]);

    if (error) {
        return (
            <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
                <p className="text-sm text-coral">{error}</p>
                <button
                    type="button"
                    onClick={goHome}
                    className="mt-6 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                >
                    Back to dashboard
                </button>
            </main>
        );
    }

    // Owner / Manager hub — tabs stay mounted while content switches
    if (ownerLike && (user?.role === 'organizer' || user?.role === 'admin')) {
        return (
            <PageShell>
                <PageHeader
                    back={{ to: '/dashboard', label: 'All events' }}
                    eyebrow={eventEyebrow(eventItem)}
                    title={eventTitle}
                    actions={(
                        <>
                            {eventItem?.slug && ['published', 'sold-out'].includes(eventItem?.status) ? (
                                <a href={`/events/${eventItem.slug}`} target="_blank" rel="noreferrer" className={buttonCls.secondary}>
                                    <ExternalLink size={13} /> View page
                                </a>
                            ) : null}
                            {canEdit ? (
                                <button type="button" onClick={handleEdit} className={buttonCls.secondary}>
                                    <Pencil size={13} /> Edit event
                                </button>
                            ) : null}
                            {['published', 'sold-out'].includes(eventItem?.status) && !isPast ? (
                                <button type="button" onClick={() => navigate(`/dashboard/sell/${eventId}`)} className={buttonCls.primary}>
                                    <Ticket size={13} /> Sell tickets
                                </button>
                            ) : null}
                        </>
                    )}
                />
                <div className="mt-2">
                    <HubTabs active={hubTab} onChange={setHubTab} />
                </div>

                {notice ? (
                    <div className="mb-5 border border-moss/25 bg-moss/10 px-4 py-3 text-sm text-moss">{notice}</div>
                ) : null}

                {hubTab === 'overview' ? (
                    <EventOverviewTab
                        eventId={eventId}
                        eventName={eventTitle}
                        event={eventItem}
                        refreshTeamMemberType={seed.refreshTeamMemberType}
                        refreshTeamMembersAt={seed.refreshTeamMembersAt}
                        refreshOverviewAt={seed.refreshOverviewAt}
                    />
                ) : null}

                {hubTab === 'earnings' ? (
                    <EarningsPanel
                        event={eventItem}
                        overview={ownerData.overview}
                        payouts={ownerData.payouts}
                        orders={ownerData.orders}
                    />
                ) : null}

                {hubTab === 'sales' ? (
                    <SalesPanel event={eventItem} orders={ownerData.orders} overview={ownerData.overview} />
                ) : null}

                {hubTab === 'checkins' ? (
                    <StaffCheckIn
                        invite={{
                            userType: 'Manager',
                            event: eventItem,
                            canScan: true,
                            permissions: { canCheckIn: true }
                        }}
                        onNotice={setNotice}
                        onBack={() => setHubTab('overview')}
                    />
                ) : null}

                {hubTab === 'payout' ? (
                    <PayoutPanel event={eventItem} payouts={ownerData.payouts} orders={ownerData.orders} />
                ) : null}
            </PageShell>
        );
    }

    // Gate staff: back button, event name, check-ins only. No tabs, no menu.
    if (scannerLike) {
        return (
            <PageShell>
                <PageHeader back={{ to: '/dashboard', label: 'All events' }} eyebrow="Gate check-in" title={eventTitle} />
                <div className="mt-6">
                    <StaffCheckIn invite={inviteForCheckIn} onNotice={setNotice} onBack={goHome} />
                </div>
                {notice ? <p className="mt-4 text-sm text-moss">{notice}</p> : null}
            </PageShell>
        );
    }

    // Ambassador / Outlet: simple header + only their own sales and commission.
    if (ambassadorLike) {
        return (
            <PageShell>
                <PageHeader back={{ to: '/dashboard', label: 'All events' }} eyebrow={`${roleBadge(eventItem)} dashboard`} title={eventTitle} />
                <div className="mt-6" />
                <StaffEventDashboard
                    invite={inviteForCheckIn}
                    dashboard={staffData}
                    loading={loading}
                    onBack={goHome}
                />
            </PageShell>
        );
    }

    return (
        <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
            {loading ? <p className="text-sm text-ink/50">Loading event dashboard…</p> : null}
            {!loading ? (
                <>
                    <p className="serif text-3xl">No dashboard access</p>
                    <p className="mt-3 text-sm text-ink/55">
                        This event is not assigned to your account as owner or staff.
                    </p>
                    <button
                        type="button"
                        onClick={goHome}
                        className="mt-6 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                    >
                        Back to dashboard
                    </button>
                </>
            ) : null}
        </main>
    );
}
