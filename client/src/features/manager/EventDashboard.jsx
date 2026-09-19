import { BarChart3, CalendarDays, Check, Coins, ExternalLink, MapPin, ScanLine, Ticket, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../../lib/money.js';
import { formatDateTimeLong } from '../../lib/datetime.js';

function cover(event) {
    return (
        event?.imageUrl ||
        event?.image ||
        event?.cover_image ||
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80'
    );
}

function when(event) {
    return formatDateTimeLong(event?.startsAt) || 'Date TBA';
}

function place(event) {
    const parts = [event?.venue?.name, event?.venue?.address, event?.venue?.city, event?.venue?.country].filter(
        Boolean
    );
    return parts.length ? parts.join(', ') : 'Venue TBA';
}

function Metric({ label, value, Icon }) {
    return (
        <div className="border border-ink/10 bg-cream p-5">
            <Icon size={16} className="text-coral" />
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/45">{label}</p>
            <p className="serif mt-1 text-3xl leading-none">{value}</p>
        </div>
    );
}

function Section({ title, action, children }) {
    return (
        <section className="border border-ink/10 bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-ink/10 pb-3">
                <h3 className="serif text-2xl">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

const TEAM_SECTIONS = [
    { type: 'Manager', title: 'Event Managers', empty: 'No managers invited yet.' },
    { type: 'Ambassador', title: 'Ticket Ambassadors', empty: 'No ambassadors invited yet.' },
    { type: 'Outlet', title: 'Ticket Outlets', empty: 'No outlets invited yet.' },
    { type: 'Event_Scanner', title: 'Gate Staff', empty: 'No gate staff invited yet.' }
];

function handlerRoleLabel(type) {
    if (type === 'Event_Scanner') return 'Gate Staff';
    if (type === 'Manager') return 'Manager';
    if (type === 'Ambassador') return 'Ambassador';
    if (type === 'Outlet') return 'Outlet';
    return type || 'Staff';
}

function handlerStatusLabel(status) {
    if (status === 'A') return 'Accepted';
    if (status === 'D') return 'Declined';
    if (status === 'P') return 'Pending';
    return null;
}

function TeamMemberList({ handlers, empty }) {
    if (!handlers.length) {
        return <p className="text-sm text-ink/50">{empty}</p>;
    }
    return (
        <ul className="divide-y divide-ink/10">
            {handlers.map((handler) => {
                const type = handler.type || handler.userType || 'staff';
                const status = handlerStatusLabel(handler.invitationStatus || handler.status);
                const name = [handler.firstName, handler.lastName].filter(Boolean).join(' ');
                return (
                    <li key={handler._id || handler.email} className="flex justify-between gap-3 py-3 text-sm">
                        <div>
                            <p className="font-medium">{name || handler.email || 'Team member'}</p>
                            {name && handler.email ? (
                                <p className="text-xs text-ink/45">{handler.email}</p>
                            ) : null}
                        </div>
                        <span className="shrink-0 text-right text-xs font-bold uppercase tracking-wider text-ink/45">
                            {handlerRoleLabel(type)}
                            {type === 'Event_Scanner' && handler.scannerPermission
                                ? ` · ${String(handler.scannerPermission).replace('_', ' ')}`
                                : ''}
                            {status ? ` · ${status}` : ''}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

export default function EventDashboard({
    event,
    data,
    loading,
    onBack,
    onGo,
    onAddMember,
    onEdit,
    canAddManagers = true
}) {
    if (loading) {
        return (
            <section className="mt-8 border border-ink/10 px-6 py-16 text-center text-ink/50">
                Loading event dashboard…
            </section>
        );
    }

    if (!event) {
        return (
            <section className="mt-8 border border-dashed border-ink/20 px-6 py-16 text-center">
                <p className="serif text-3xl">No event selected</p>
                <p className="mt-2 text-sm text-ink/55">Pick an event from your catalog to open its dashboard.</p>
                <button
                    type="button"
                    onClick={onBack}
                    className="mt-6 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                >
                    Browse events
                </button>
            </section>
        );
    }

    const orders = data.orders || {};
    const overview = data.overview || {};
    const checkIns = data.checkIns || {};
    const payouts = data.payouts || {};
    const tickets = data.tickets || event.ticketTypes || [];
    const guests = data.guests || [];
    const handlers = data.handlers || [];
    const coupons = data.coupons || [];
    const recent = Array.isArray(orders.table_data) ? orders.table_data.slice(0, 8) : [];

    const sold = overview.tickets_sold ?? orders.total_sold ?? 0;
    const available = overview.tickets_available ?? 0;
    const soldPercent = overview.sold_percent ?? 0;

    return (
        <section className="mt-8 space-y-6">
            <div className="overflow-hidden border border-ink/10 bg-ink text-white">
                <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative min-h-[280px]">
                        <img src={cover(event)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                        <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                            <button
                                type="button"
                                onClick={onBack}
                                className="mb-4 w-fit text-[11px] font-extrabold uppercase tracking-wider text-white/70 hover:text-white"
                            >
                                ← All events
                            </button>
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-butter">
                                {(event.status || 'draft').replace('-', ' ')} · {event.category || 'Event'}
                                {event.featured ? ' · Featured' : ''}
                            </p>
                            <h1 className="serif mt-3 text-4xl leading-none sm:text-6xl">{event.title}</h1>
                            <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/75">
                                <span className="inline-flex items-center gap-2">
                                    <CalendarDays size={15} className="text-butter" />
                                    {when(event)}
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <MapPin size={15} className="text-butter" />
                                    {place(event)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-between border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
                        <div>
                            <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/45">About</p>
                            <p className="mt-3 text-sm leading-7 text-white/75">
                                {event.description || 'No description yet.'}
                            </p>
                            {event.slug && (
                                <p className="mt-4 text-xs text-white/45">
                                    Public slug: <span className="text-butter">{event.slug}</span>
                                </p>
                            )}
                            {(event.status === 'published' || event.status === 'sold-out') && (event.slug || event._id) && (
                                <Link
                                    to={`/events/${event.slug || event._id}`}
                                    className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-butter hover:text-white"
                                >
                                    <ExternalLink size={14} /> Buy / view public page
                                </Link>
                            )}
                        </div>
                        <div className="mt-8 grid grid-cols-2 gap-2">
                            {onEdit ? (
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    className="col-span-2 border border-white/20 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider"
                                >
                                    Edit event
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => onGo('sales')}
                                className="bg-coral px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider"
                            >
                                Sales
                            </button>
                            <button
                                type="button"
                                onClick={() => (onEdit ? onEdit() : onGo('tickets'))}
                                className="border border-white/20 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider"
                            >
                                Tickets
                            </button>
                            <button
                                type="button"
                                onClick={() => onGo('people')}
                                className="border border-white/20 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider"
                            >
                                People
                            </button>
                            <button
                                type="button"
                                onClick={() => onGo('gate')}
                                className="border border-white/20 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider"
                            >
                                Check-in
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Gross sales" value={money(orders.gross_sales)} Icon={Coins} />
                <Metric label="Tickets sold" value={`${sold}${available ? ` / ${available}` : ''}`} Icon={Ticket} />
                <Metric label="Sold %" value={`${soldPercent}%`} Icon={BarChart3} />
                <Metric
                    label="Checked in"
                    value={`${checkIns.claimed_tickets || 0} / ${(checkIns.claimed_tickets || 0) + (checkIns.unclaimed_tickets || 0) || '—'}`}
                    Icon={Check}
                />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Payout due" value={money(payouts.payout_due ?? orders.payout_due)} Icon={Coins} />
                <Metric label="Fees" value={money(payouts.fees ?? orders.fees)} Icon={BarChart3} />
                <Metric label="Unclaimed" value={checkIns.unclaimed_tickets ?? orders.unclaimed_tickets ?? 0} Icon={ScanLine} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Section
                    title="Ticket types"
                    action={
                        <button type="button" onClick={() => onGo('tickets')} className="text-xs font-extrabold uppercase tracking-wider text-coral">
                            Manage
                        </button>
                    }
                >
                    {tickets.length ? (
                        <ul className="divide-y divide-ink/10">
                            {tickets.map((tier) => (
                                <li key={tier._id || tier.name} className="flex items-center justify-between py-3 text-sm">
                                    <div>
                                        <p className="font-bold">{tier.name}</p>
                                        <p className="text-xs text-ink/45">{tier.salesStatus || 'on-sale'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{money(tier.price)}</p>
                                        <p className="text-xs text-ink/45">
                                            {tier.sold || 0}/{tier.quantity ?? '∞'}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink/50">No ticket types yet.</p>
                    )}
                </Section>

                <Section
                    title="Recent sales"
                    action={
                        <button type="button" onClick={() => onGo('sales')} className="text-xs font-extrabold uppercase tracking-wider text-coral">
                            All sales
                        </button>
                    }
                >
                    {recent.length ? (
                        <ul className="divide-y divide-ink/10">
                            {recent.map((row, index) => (
                                <li key={row.confirmation_id || index} className="flex justify-between gap-3 py-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-bold">{row.ticket_type || 'Ticket'}</p>
                                        <p className="truncate text-xs text-ink/45">{row.confirmation_id}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-bold">{money(row.price_paid)}</p>
                                        <p className="text-xs text-ink/45">{row.payment_status || 'Paid'}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink/50">No sales yet for this event.</p>
                    )}
                </Section>

                <Section
                    title="Guests"
                    action={
                        <button type="button" onClick={() => onGo('people')} className="text-xs font-extrabold uppercase tracking-wider text-coral">
                            Manage
                        </button>
                    }
                >
                    {guests.length ? (
                        <ul className="divide-y divide-ink/10">
                            {guests.map((guest) => (
                                <li key={guest._id || guest.email} className="flex items-center gap-2 py-3 text-sm">
                                    <Users size={14} className="text-coral" />
                                    <span>
                                        {guest.name}
                                        {guest.email ? <span className="text-ink/45"> · {guest.email}</span> : null}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink/50">No featured guests yet.</p>
                    )}
                </Section>

                <div className="space-y-4">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Team</p>
                            <h2 className="serif mt-1 text-3xl">Event handlers</h2>
                        </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        {TEAM_SECTIONS.filter((section) => section.type !== 'Manager' || canAddManagers || handlers.some((h) => (h.type || h.userType) === 'Manager')).map((section) => {
                            const rows = handlers.filter((handler) => (handler.type || handler.userType) === section.type);
                            const canAdd = section.type === 'Manager' ? canAddManagers : Boolean(onAddMember);
                            return (
                                <Section
                                    key={section.type}
                                    title={section.title}
                                    action={
                                        canAdd ? (
                                            <button
                                                type="button"
                                                onClick={() => onAddMember?.(section.type)}
                                                className="text-xs font-extrabold uppercase tracking-wider text-coral"
                                            >
                                                + Add Member
                                            </button>
                                        ) : null
                                    }
                                >
                                    <TeamMemberList handlers={rows} empty={section.empty} />
                                </Section>
                            );
                        })}
                    </div>
                </div>

                <Section
                    title="Coupons"
                    action={
                        <button type="button" onClick={() => onGo('coupons')} className="text-xs font-extrabold uppercase tracking-wider text-coral">
                            Manage
                        </button>
                    }
                >
                    {coupons.length ? (
                        <ul className="divide-y divide-ink/10">
                            {coupons.map((coupon) => (
                                <li key={coupon._id || coupon.code} className="flex justify-between py-3 text-sm">
                                    <span className="font-bold">{coupon.code}</span>
                                    <span className="text-ink/55">
                                        {coupon.discountType === 'percentage' || coupon.discount_type === 'percentage'
                                            ? `${coupon.discountValue ?? coupon.discount_value}%`
                                            : money(coupon.discountValue ?? coupon.discount_value)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink/50">No coupons for this event.</p>
                    )}
                </Section>

                <Section title="Sales by source">
                    {(overview.sales_sources || []).length ? (
                        <ul className="divide-y divide-ink/10">
                            {overview.sales_sources.map((source) => (
                                <li key={source.source} className="flex justify-between py-3 text-sm">
                                    <span>{source.source}</span>
                                    <span className="font-bold">{source.count}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-ink/50">Source breakdown will appear after sales.</p>
                    )}
                </Section>
            </div>
        </section>
    );
}

