import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BarChart3, Coins, Ticket } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import { money } from '../../lib/money.js';
import EventDashboard from '../manager/EventDashboard.jsx';
import StaffEventDashboard from '../staff/StaffEventDashboard.jsx';
import StaffCheckIn from '../staff/StaffCheckIn.jsx';
import {
    canScan,
    isAmbassadorLike,
    isOwnerLike,
    isScannerLike,
    roleBadge
} from './dashboardUtils.js';

const OWNER_TABS = [
    { id: 'overview', label: 'Overview' },
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

function HubTabs({ active, onChange, tabs = OWNER_TABS }) {
    return (
        <nav className="sticky top-[73px] z-20 -mx-5 mb-6 border-b border-ink/10 bg-cream/95 px-5 backdrop-blur lg:-mx-8 lg:px-8" aria-label="Event dashboard tabs">
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
    const scannerLike = isScannerLike(eventItem) || (!ownerLike && canScan(eventItem));
    const ambassadorLike = isAmbassadorLike(eventItem);

    useEffect(() => {
        let cancelled = false;

        const resolveEventMeta = async () => {
            if (seed.eventItem) return seed.eventItem;
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
            <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
                <HubTabs active={hubTab} onChange={setHubTab} />

                {notice ? (
                    <div className="mb-5 border border-moss/25 bg-moss/10 px-4 py-3 text-sm text-moss">{notice}</div>
                ) : null}

                {hubTab === 'overview' ? (
                    <EventDashboard
                        event={eventItem}
                        data={ownerData}
                        loading={loading}
                        onBack={goHome}
                        onGo={(view) => {
                            if (view === 'gate') setHubTab('checkins');
                            else if (view === 'sales') setHubTab('sales');
                            else setHubTab('overview');
                        }}
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
            </main>
        );
    }

    // Scanner hub
    if (scannerLike && !ownerLike) {
        const scannerTabs = [
            { id: 'overview', label: 'Overview' },
            { id: 'checkins', label: 'Check-ins' }
        ];
        return (
            <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
                <HubTabs active={hubTab === 'checkins' ? 'checkins' : 'overview'} onChange={setHubTab} tabs={scannerTabs} />
                {hubTab === 'checkins' ? (
                    <StaffCheckIn
                        invite={inviteForCheckIn}
                        onNotice={setNotice}
                        onBack={() => setHubTab('overview')}
                    />
                ) : (
                    <StaffEventDashboard
                        invite={inviteForCheckIn}
                        dashboard={staffData}
                        loading={loading}
                        onBack={goHome}
                        onOpenCheckIn={() => setHubTab('checkins')}
                    />
                )}
                {notice ? <p className="mt-4 text-sm text-moss">{notice}</p> : null}
            </main>
        );
    }

    // Ambassador / Outlet hub
    if (ambassadorLike) {
        const tabs = canScan(eventItem)
            ? [
                { id: 'overview', label: 'Overview' },
                { id: 'checkins', label: 'Check-ins' }
            ]
            : [{ id: 'overview', label: 'Overview' }];
        return (
            <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
                <HubTabs active={hubTab} onChange={setHubTab} tabs={tabs} />
                <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">
                    {roleBadge(eventItem)} dashboard
                </p>
                {hubTab === 'checkins' && canScan(eventItem) ? (
                    <StaffCheckIn invite={inviteForCheckIn} onNotice={setNotice} onBack={() => setHubTab('overview')} />
                ) : (
                    <StaffEventDashboard
                        invite={inviteForCheckIn}
                        dashboard={staffData}
                        loading={loading}
                        onBack={goHome}
                        onOpenCheckIn={canScan(eventItem) ? () => setHubTab('checkins') : undefined}
                    />
                )}
                <p className="mt-8 text-sm text-ink/55">
                    Selling tools stay on your staff desk for now.{' '}
                    <Link to="/invitations" className="font-bold text-coral">
                        Open staff desk
                    </Link>
                </p>
            </main>
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
