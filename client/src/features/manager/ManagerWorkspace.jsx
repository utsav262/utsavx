import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BarChart3, CalendarDays, Check, Coins, Plus, ScanLine, Settings2, Ticket, Users } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { money } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import { unwrap, unwrapList as list } from '../../lib/unwrap.js';
import { useToast } from '../../components/ui/Toast.jsx';
import CreateEventFlow from './CreateEventFlow.jsx';
import EventDashboard from './EventDashboard.jsx';
import AdminHome from './AdminHome.jsx';
import TicketFlow from '../tickets/TicketFlow.jsx';
import { ticketFromApi } from '../tickets/ticketUtils.js';

function Stat({ label, value, Icon }) {
    return <div className="bg-cream p-5"><Icon size={17} className="text-coral" /><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-ink/50">{label}</p><p className="serif mt-1 text-3xl">{value}</p></div>;
}
function Table({ rows = [], columns }) {
    const dateColumns = new Set(['created_on', 'createdAt', 'updatedAt', 'startsAt', 'endsAt', 'scannedAt', 'date']);
    return (
        <div className="mt-5 overflow-x-auto border-y border-ink/15">
            <table className="w-full text-left text-sm">
                <thead><tr>{columns.map((column) => <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-ink/50" key={column}>{column}</th>)}</tr></thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr className="border-t border-ink/10" key={row._id || row.id || index}>
                            {columns.map((column) => {
                                const raw = row[column];
                                const display = dateColumns.has(column)
                                    ? (formatDateTime(raw) || String(raw ?? '—'))
                                    : String(raw ?? '—');
                                return <td className="whitespace-nowrap px-3 py-3" key={column}>{display}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            {!rows.length && <p className="px-3 py-8 text-sm text-ink/50">No records yet.</p>}
        </div>
    );
}
function Panel({ title, children }) {
    return <section className="mt-8"><div className="flex items-center justify-between border-b border-ink/15 pb-5"><h2 className="serif text-4xl">{title}</h2><Settings2 size={18} className="text-ink/40" /></div>{children}</section>;
}

function eventCover(event) {
    return (
        event.imageUrl ||
        event.image ||
        event.cover_image ||
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=80'
    );
}

function eventWhen(event) {
    return formatDateTime(event?.startsAt) || 'Date TBA';
}

function eventPlace(event) {
    return event.venue?.city || event.venue?.name || event.city || 'Venue TBA';
}

function EventCard({ event, active, onOpen }) {
    const sold = (event.ticketTypes || []).reduce((sum, tier) => sum + Number(tier.sold || 0), 0);
    const capacity = (event.ticketTypes || []).reduce((sum, tier) => sum + Number(tier.quantity || 0), 0);
    const prices = (event.ticketTypes || []).map((tier) => Number(tier.price)).filter((n) => !Number.isNaN(n));
    const from = prices.length ? Math.min(...prices) : Infinity;
    const status = event.status || 'draft';

    return (
        <article
            className={`group overflow-hidden border bg-white transition ${
                active ? 'border-coral shadow-[0_12px_40px_rgba(232,93,76,0.12)]' : 'border-ink/10 hover:border-ink/25'
            }`}
        >
            <button type="button" onClick={() => onOpen(event)} className="block w-full text-left">
                <div className="relative aspect-[16/10] overflow-hidden bg-moss">
                    <img
                        src={eventCover(event)}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 bg-cream px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]">
                        {status}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-butter">
                            {event.category || 'Event'}
                        </p>
                        <h3 className="serif mt-1 text-2xl leading-none">{event.title}</h3>
                    </div>
                </div>
                <div className="space-y-3 p-4">
                    <p className="flex items-center gap-2 text-sm text-ink/60">
                        <CalendarDays size={14} className="text-coral" />
                        {eventWhen(event)}
                    </p>
                    <p className="text-sm text-ink/55">{eventPlace(event)}</p>
                    <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-xs font-bold uppercase tracking-wider text-ink/50">
                        <span>{sold}/{capacity || '—'} sold</span>
                        <span>{Number.isFinite(from) ? `from ${money(from)}` : 'Free / TBA'}</span>
                    </div>
                </div>
            </button>
            <button
                type="button"
                onClick={() => onOpen(event)}
                className="w-full border-t border-ink/10 bg-ink px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
            >
                Open dashboard
            </button>
        </article>
    );
}

export default function ManagerWorkspace() {
    const user = useSelector((state) => state.auth.user);
    const location = useLocation();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin';
    const [view, setView] = useState(location.state?.view === 'create' ? 'create' : 'home');
    const [editEventId, setEditEventId] = useState(location.state?.eventId || null);
    const [dashboard, setDashboard] = useState(null);
    const [events, setEvents] = useState([]);
    const [pending, setPending] = useState([]);
    const [users, setUsers] = useState([]);
    const [adminOverview, setAdminOverview] = useState(null);
    const [selected, setSelected] = useState(null);
    const [eventLoading, setEventLoading] = useState(false);
    const [data, setData] = useState({
        orders: null,
        overview: null,
        checkIns: null,
        payouts: null,
        tickets: [],
        coupons: [],
        guests: [],
        handlers: []
    });
    const [notice, setNotice] = useState('');

    const load = async () => {
        try {
            const requests = [apiClient.managerDashboard(), apiClient.managerEvents()];
            if (isAdmin) {
                requests.push(
                    apiClient.managerPendingEvents(),
                    apiClient.adminOverview(),
                    apiClient.adminUsers()
                );
            }
            const [dash, eventResponse, pendingResponse, overviewResponse, usersResponse] = await Promise.all(requests);
            setDashboard(dash.data.result);
            setEvents(list(eventResponse));
            if (isAdmin) {
                setPending(list(pendingResponse));
                setAdminOverview(unwrap(overviewResponse, null));
                setUsers(list(usersResponse));
            }
        } catch (error) {
            setNotice(error.response?.data?.message || 'Unable to load manager data.');
        }
    };

    useEffect(() => {
        load();
    }, [isAdmin]);

    useEffect(() => {
        if (location.state?.view === 'create') {
            setView('create');
            setEditEventId(location.state?.eventId || null);
        }
    }, [location.state]);

    const reviewEvent = async (eventId, action) => {
        try {
            if (action === 'approve') await apiClient.managerApproveEvent(eventId);
            else await apiClient.managerRejectEvent(eventId);
            setNotice(action === 'approve' ? 'Event approved and published.' : 'Event rejected and returned to draft.');
            await load();
        } catch (error) {
            setNotice(error.response?.data?.message || 'Review action failed.');
        }
    };

    const setEventStatus = async (eventId, status) => {
        try {
            await apiClient.adminSetEventStatus(eventId, status);
            setNotice(`Event status set to ${status}.`);
            await load();
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not update event status.');
        }
    };

    const toggleFeatured = async (eventId, featured) => {
        try {
            await apiClient.adminSetEventFeatured(eventId, featured);
            setNotice(featured ? 'Event featured on home.' : 'Event removed from featured.');
            await load();
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not update featured flag.');
        }
    };

    const setUserRole = async (userId, role) => {
        try {
            await apiClient.adminUpdateUserRole(userId, role);
            setNotice(`User role updated to ${role}.`);
            await load();
        } catch (error) {
            setNotice(error.response?.data?.message || 'Could not update user role.');
        }
    };

    const openEventDashboard = async (event) => {
        if (!event?._id) return;
        setEventLoading(true);
        setSelected(event);
        setView('event');
        setNotice('');
        try {
            const [detail, orders, overview, checkIns, payouts, tickets, coupons, guests, handlers] =
                await Promise.all([
                    apiClient.managerEvent(event._id),
                    apiClient.managerOrders(event._id, { type: 'transactions', length: 20 }),
                    apiClient.managerSalesOverview(event._id),
                    apiClient.managerCheckIns(event._id),
                    apiClient.managerPayouts(event._id),
                    apiClient.managerTickets(event._id),
                    apiClient.managerCoupons(event._id),
                    apiClient.managerGuests(event._id),
                    apiClient.managerHandlers(event._id)
                ]);

            const fullEvent = unwrap(detail, event);
            setSelected(fullEvent && !Array.isArray(fullEvent) ? fullEvent : event);
            setData({
                orders: unwrap(orders, null),
                overview: unwrap(overview, null),
                checkIns: unwrap(checkIns, null),
                payouts: unwrap(payouts, null),
                tickets: list(tickets),
                coupons: list(coupons),
                guests: list(guests),
                handlers: list(handlers)
            });
        } catch (error) {
            setNotice(error.response?.data?.message || 'Unable to load event dashboard.');
        } finally {
            setEventLoading(false);
        }
    };

    const reloadSelected = async () => {
        if (selected) await openEventDashboard(selected);
    };

    const goHome = () => {
        setView('home');
        setNotice('');
    };

    return (
        <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
            {view === 'home' && (
                <div className="flex flex-col justify-between gap-5 border-b border-ink/15 pb-8 md:flex-row md:items-end">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">
                            {isAdmin ? 'UTSAVX admin' : 'Create / tools'}
                        </p>
                        <h1 className="serif mt-2 text-6xl">{isAdmin ? 'Full access.' : 'Build & ship.'}</h1>
                        <p className="mt-3 max-w-xl text-sm text-ink/60">
                            {isAdmin
                                ? 'Approve events, manage every host catalog, change roles, and open any event dashboard.'
                                : 'Create events and use hosting tools here. Your event list lives on Dashboard.'}
                        </p>
                    </div>
                    {!isAdmin ? (
                        <button
                            type="button"
                            onClick={() => setView('create')}
                            className="inline-flex items-center justify-center gap-2 bg-coral px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white"
                        >
                            <Plus size={15} /> Create event
                        </button>
                    ) : null}
                </div>
            )}

            {notice && <div className="mt-5 border border-coral/20 bg-coral/10 px-4 py-3 text-sm">{notice}</div>}

            {view === 'home' && (
                isAdmin ? (
                    <AdminHome
                        overview={adminOverview}
                        events={events}
                        pending={pending}
                        users={users}
                        selected={selected}
                        onOpen={openEventDashboard}
                        onApprove={(id) => reviewEvent(id, 'approve')}
                        onReject={(id) => reviewEvent(id, 'reject')}
                        onSetStatus={setEventStatus}
                        onToggleFeatured={toggleFeatured}
                        onSetRole={setUserRole}
                    />
                ) : (
                    <ToolsHome
                        dashboard={dashboard}
                        onCreate={() => {
                            setEditEventId(null);
                            setView('create');
                        }}
                        onOpenDashboard={() => navigate('/dashboard')}
                    />
                )
            )}

            {view === 'create' && (
                <CreateEventFlow
                    key={editEventId || 'new'}
                    eventId={editEventId}
                    reload={load}
                    notice={setNotice}
                    onCancel={() => {
                        setView('home');
                        setEditEventId(null);
                        navigate('/dashboard', { replace: true });
                    }}
                    onCreated={async (event) => {
                        await load();
                        setEditEventId(null);
                        navigate(`/dashboard/events/${event._id || event.id}`, {
                            state: {
                                eventId: event._id || event.id,
                                eventItem: { ...event, is_owner: true, event_handler_type: 'Owner' },
                                name: event.title
                            }
                        });
                    }}
                />
            )}

            {view === 'event' && (
                <EventDashboard
                    event={selected}
                    data={data}
                    loading={eventLoading}
                    onBack={goHome}
                    onGo={(next) => setView(next)}
                    canAddManagers
                    onEdit={() => {
                        setEditEventId(selected._id);
                        setView('create');
                    }}
                    onAddMember={(type) => {
                        navigate(`/dashboard/events/${selected._id}/team/add`, {
                            state: {
                                type,
                                eventId: selected._id,
                                eventTitle: selected.title || selected.name || 'Event',
                                ticketTypes: data.tickets?.length ? data.tickets : selected.ticketTypes || []
                            }
                        });
                    }}
                />
            )}

            {view === 'sales' && (
                <SubView title="Sales" onBack={() => setView('event')}>
                    <Sales event={selected} orders={data.orders} />
                </SubView>
            )}
            {view === 'tickets' && selected && (
                <SubView title="Tickets" onBack={() => setView('event')}>
                    <TicketFlow
                        eventId={selected._id}
                        eventTitle={selected.title || 'Event'}
                        tickets={(data.tickets || []).map(ticketFromApi)}
                        onTicketsChange={async (rows) => {
                            if (Array.isArray(rows)) {
                                setData((prev) => ({ ...prev, tickets: rows }));
                            }
                            await reloadSelected();
                        }}
                        notice={setNotice}
                        onClose={() => setView('event')}
                    />
                </SubView>
            )}
            {view === 'people' && (
                <SubView title="People" onBack={() => setView('event')}>
                    <People event={selected} data={data} reload={reloadSelected} notice={setNotice} />
                </SubView>
            )}
            {view === 'coupons' && (
                <SubView title="Coupons" onBack={() => setView('event')}>
                    <Coupons event={selected} rows={data.coupons} reload={reloadSelected} notice={setNotice} />
                </SubView>
            )}
            {view === 'gate' && (
                <SubView title="Check-in" onBack={() => setView('event')}>
                    <Gate event={selected} notice={setNotice} />
                </SubView>
            )}
        </main>
    );
}

function SubView({ title, onBack, children }) {
    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={onBack}
                className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
            >
                ← Back to event dashboard
            </button>
            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">{title}</p>
            {children}
        </div>
    );
}

function ToolsHome({ dashboard, onCreate, onOpenDashboard }) {
    const revenue = dashboard?.revenue || {};
    return (
        <section className="mt-8">
            <div className="grid gap-px bg-ink/15 sm:grid-cols-4">
                <Stat label="Revenue" value={money(revenue.total)} Icon={Coins} />
                <Stat label="Tickets sold" value={revenue.tickets_sold || 0} Icon={Ticket} />
                <Stat label="Capacity" value={revenue.ticket_cap || 0} Icon={BarChart3} />
                <Stat label="Live events" value={dashboard?.events?.live?.total || 0} Icon={CalendarDays} />
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onCreate}
                    className="border border-ink/15 bg-white p-6 text-left transition hover:border-ink/30"
                >
                    <Plus size={18} className="text-coral" />
                    <p className="serif mt-4 text-3xl">Create event</p>
                    <p className="mt-2 text-sm text-ink/55">
                        Start a new draft, add tickets and team, then submit for approval.
                    </p>
                </button>
                <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="border border-ink/15 bg-white p-6 text-left transition hover:border-ink/30"
                >
                    <CalendarDays size={18} className="text-coral" />
                    <p className="serif mt-4 text-3xl">Open dashboard</p>
                    <p className="mt-2 text-sm text-ink/55">
                        View Live / Past / Draft events and open each event dashboard from there.
                    </p>
                </button>
            </div>
        </section>
    );
}

function HomeScreen({ dashboard, events, selected, onOpen, onCreate }) {
    const revenue = dashboard?.revenue || {};
    return (
        <section className="mt-8">
            <div className="grid gap-px bg-ink/15 sm:grid-cols-4">
                <Stat label="Revenue" value={money(revenue.total)} Icon={Coins} />
                <Stat label="Tickets sold" value={revenue.tickets_sold || 0} Icon={Ticket} />
                <Stat label="Capacity" value={revenue.ticket_cap || 0} Icon={BarChart3} />
                <Stat label="Live events" value={dashboard?.events?.live?.total || 0} Icon={CalendarDays} />
            </div>

            <div className="mt-10 flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Your catalog</p>
                    <h2 className="serif mt-2 text-4xl leading-none sm:text-5xl">Events</h2>
                    <p className="mt-3 text-sm text-ink/55">
                        {events.length} event{events.length === 1 ? '' : 's'} · tap a card to open its dashboard
                    </p>
                </div>
            </div>

            {events.length ? (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {events.map((event) => (
                        <EventCard
                            key={event._id}
                            event={event}
                            active={selected?._id === event._id}
                            onOpen={onOpen}
                        />
                    ))}
                </div>
            ) : (
                <div className="mt-10 border border-dashed border-ink/20 px-6 py-16 text-center">
                    <p className="serif text-3xl">No events yet</p>
                    <p className="mx-auto mt-3 max-w-md text-sm text-ink/55">
                        Create your first event to sell tickets, invite team, and open the door.
                    </p>
                    <button
                        type="button"
                        onClick={onCreate}
                        className="mt-6 inline-flex items-center gap-2 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                    >
                        <Plus size={14} /> Create event
                    </button>
                </div>
            )}
        </section>
    );
}

function Sales({ event, orders }) {
    if (!event) return <Panel title="Sales"><p className="mt-8 text-sm text-ink/55">Select an event first.</p></Panel>;
    return (
        <Panel title="Sales">
            <div className="mt-6 grid gap-px bg-ink/15 sm:grid-cols-3">
                <Stat label="Gross sales" value={money(orders?.gross_sales)} Icon={Coins} />
                <Stat label="Tickets sold" value={orders?.total_sold || 0} Icon={Ticket} />
                <Stat label="Payout due" value={money(orders?.payout_due)} Icon={BarChart3} />
            </div>
            <Table rows={orders?.table_data} columns={['ticket_type', 'confirmation_id', 'payment_status', 'price_paid']} />
        </Panel>
    );
}

function Coupons({ event, rows, reload, notice }) {
    const [code, setCode] = useState('');
    if (!event) return <Panel title="Coupons"><p className="mt-8 text-sm text-ink/55">Select an event first.</p></Panel>;
    const save = async (e) => {
        e.preventDefault();
        try {
            await apiClient.managerCreateCoupon({ event_id: event._id, code, discount_type: 'percentage', discount_value: 10 });
            notice('Coupon created.');
            setCode('');
            reload();
        } catch (error) {
            notice(error.response?.data?.message || 'Coupon could not be created.');
        }
    };
    return (
        <Panel title="Coupons">
            <Table rows={rows} columns={['code', 'discountType', 'discountValue', 'isActive']} />
            <form onSubmit={save} className="mt-6 flex gap-2">
                <input required className="border border-ink/15 bg-transparent px-3 py-2 uppercase" placeholder="CODE10" value={code} onChange={(e) => setCode(e.target.value)} />
                <button className="rounded bg-ink px-4 py-2 text-sm font-bold text-white">Add 10% coupon</button>
            </form>
        </Panel>
    );
}

function People({ event, data, reload, notice }) {
    const [guest, setGuest] = useState({ name: '', email: '' });
    const [handler, setHandler] = useState({ email: '', type: 'Event_Scanner' });
    if (!event) return <Panel title="People"><p className="mt-8 text-sm text-ink/55">Select an event first.</p></Panel>;
    const addGuest = async (e) => {
        e.preventDefault();
        try {
            await apiClient.managerCreateGuest({ ...guest, eventId: event._id });
            setGuest({ name: '', email: '' });
            notice('Guest added.');
            reload();
        } catch (error) {
            notice(error.response?.data?.message || 'Guest could not be added.');
        }
    };
    const addHandler = async (e) => {
        e.preventDefault();
        try {
            await apiClient.managerAddHandler({ ...handler, eventId: event._id, type: handler.type || 'Event_Scanner' });
            setHandler({ email: '', type: 'Event_Scanner' });
            notice('Team invite created.');
            reload();
        } catch (error) {
            notice(error.response?.data?.message || 'Team invite failed.');
        }
    };
    const teamRows = (data.handlers || []).map((row) => ({
        ...row,
        role: row.userType === 'Event_Scanner'
            ? 'Event Scanner'
            : row.userType === 'Manager'
                ? 'Event Manager'
                : row.userType || 'Staff',
        status: row.invitationStatus === 'A' ? 'Accepted' : row.invitationStatus === 'D' ? 'Declined' : 'Pending'
    }));
    return (
        <Panel title="Guests & team">
            <div className="grid gap-10 lg:grid-cols-2">
                <div>
                    <h3 className="font-bold">Guests</h3>
                    <form onSubmit={addGuest} className="mt-3 flex gap-2">
                        <input required className="min-w-0 flex-1 border border-ink/15 bg-transparent px-2 py-2" placeholder="Name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
                        <input required type="email" className="min-w-0 flex-1 border border-ink/15 bg-transparent px-2 py-2" placeholder="Email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
                        <button className="bg-ink px-3 text-white"><Plus size={15} /></button>
                    </form>
                    <Table rows={data.guests} columns={['name', 'email', 'status']} />
                </div>
                <div>
                    <h3 className="font-bold">Team</h3>
                    <form onSubmit={addHandler} className="mt-3 flex gap-2">
                        <input required type="email" className="min-w-0 flex-1 border border-ink/15 bg-transparent px-2 py-2" placeholder="Email" value={handler.email} onChange={(e) => setHandler({ ...handler, email: e.target.value })} />
                        <button className="bg-ink px-3 text-white"><Plus size={15} /></button>
                    </form>
                    <Table rows={teamRows} columns={['email', 'role', 'status']} />
                </div>
            </div>
        </Panel>
    );
}

function normalizeScanCode(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (value.startsWith('{')) {
        try {
            const parsed = JSON.parse(value);
            return String(parsed.confirmationCode || parsed.confirmation_id || parsed.code || value).trim();
        } catch {
            return value;
        }
    }
    return value;
}

function Gate({ event, notice }) {
    const toast = useToast();
    const [code, setCode] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const scan = async (action) => {
        setFieldError('');
        setResult(null);
        if (!event) {
            setFieldError('Select an event first.');
            return notice('Select an event first.');
        }
        const normalized = normalizeScanCode(code);
        if (!normalized) {
            setFieldError('Enter or scan a confirmation code.');
            return;
        }
        setBusy(true);
        try {
            const response = await apiClient.scanTicket({ event_id: event._id, code: normalized, action });
            const message = response.data.message || 'Ticket processed.';
            setResult({ ok: true, message, status: response.data.ticket_status || response.data.status });
            toast.success(message);
            notice('');
            if (action === 'scan') setCode('');
        } catch (error) {
            const data = error.response?.data || {};
            const status = data.ticket_status || data.status;
            const message =
                status === 'invalid'
                    ? 'Invalid ticket — confirmation code not found for this event.'
                    : status === 'already_claimed'
                        ? 'Ticket already claimed.'
                        : data.message || 'Ticket scan failed.';
            setFieldError(message);
            setResult({ ok: false, message, status });
            notice('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Panel title="Gate check-in">
            <p className="mt-6 text-sm text-ink/55">Paste or type the QR confirmation code, then validate or claim.</p>
            <div className="mt-5 flex max-w-lg gap-2">
                <input
                    className={`min-w-0 flex-1 border bg-transparent px-3 py-3 ${
                        fieldError ? 'border-coral' : 'border-ink/15'
                    }`}
                    placeholder="Scan or paste confirmation code"
                    value={code}
                    disabled={busy}
                    onChange={(e) => {
                        setCode(e.target.value);
                        if (fieldError) setFieldError('');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') scan('scan'); }}
                />
                <button type="button" disabled={busy} onClick={() => scan('validate')} className="border border-ink/15 px-4 disabled:opacity-60">
                    <ScanLine size={18} />
                </button>
                <button type="button" disabled={busy} onClick={() => scan('scan')} className="bg-coral px-4 text-white disabled:opacity-60">
                    <Check size={18} />
                </button>
            </div>
            {fieldError ? <p className="mt-3 text-sm text-coral">{fieldError}</p> : null}
            {result?.ok ? <p className="mt-3 text-sm text-moss">{result.message}</p> : null}
        </Panel>
    );
}
