import { money } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import { eventCover, place, roleLabel } from './staffHelpers.jsx';
import { BarChart3, CalendarDays, Check, MapPin, ScanLine, Ticket } from 'lucide-react';

function Metric({ label, value, Icon }) {
    return (
        <div className="border border-ink/10 bg-cream p-5">
            <Icon size={16} className="text-coral" />
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/45">{label}</p>
            <p className="serif mt-1 text-3xl leading-none">{value}</p>
        </div>
    );
}

export default function StaffEventDashboard({
    invite,
    dashboard,
    loading,
    onBack,
    onOpenCheckIn
}) {
    const event = dashboard?.event || invite?.event || {};
    const permissions = dashboard?.permissions || invite?.permissions || {};
    const checkIns = dashboard?.checkIns || {};
    const sales = dashboard?.sales || null;
    const handlerType = invite?.userType || dashboard?.handler?.userType;

    if (loading) {
        return (
            <section className="border border-ink/10 px-6 py-16 text-center text-ink/50">
                Loading event dashboard…
            </section>
        );
    }

    if (!event?._id && !event?.id) {
        return (
            <section className="border border-dashed border-ink/20 px-6 py-16 text-center">
                <p className="serif text-3xl">No event selected</p>
                <p className="mt-2 text-sm text-ink/55">Pick an event from your catalog to open its dashboard.</p>
                <button
                    type="button"
                    onClick={onBack}
                    className="mt-6 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                >
                    Browse catalog
                </button>
            </section>
        );
    }

    const ticketTypes = event.ticketTypes || [];
    const sold = ticketTypes.reduce((sum, tier) => sum + Number(tier.sold || 0), 0);
    const capacity = ticketTypes.reduce((sum, tier) => sum + Number(tier.quantity || 0), 0);

    return (
        <section className="space-y-6">
            <div className="overflow-hidden border border-ink/10 bg-ink text-white">
                <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="relative min-h-[280px]">
                        <img src={eventCover(event)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                        <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                            <button
                                type="button"
                                onClick={onBack}
                                className="mb-4 w-fit text-[11px] font-extrabold uppercase tracking-wider text-white/70 hover:text-white"
                            >
                                ← Your catalog
                            </button>
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-butter">
                                {(event.status || 'draft').replace('-', ' ')} · {event.category || 'Event'}
                            </p>
                            <h1 className="serif mt-3 text-4xl leading-none sm:text-6xl">{event.title}</h1>
                            <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/75">
                                <span className="inline-flex items-center gap-2">
                                    <CalendarDays size={15} className="text-butter" />
                                    {formatDateTime(event.startsAt) || 'Date TBA'}
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
                            <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/45">Your access</p>
                            <p className="serif mt-3 text-3xl">{roleLabel(handlerType)}</p>
                            <p className="mt-3 text-sm leading-7 text-white/70">
                                {event.description || 'No description yet.'}
                            </p>
                            <ul className="mt-5 space-y-2 text-xs font-bold uppercase tracking-wider text-white/55">
                                {permissions.canCheckIn ? <li>· Check-in enabled</li> : null}
                                {permissions.canViewSales ? <li>· Sales overview</li> : null}
                                {permissions.canSell ? <li>· Sell access</li> : null}
                                {permissions.canManage ? <li>· Manage access</li> : null}
                            </ul>
                        </div>

                        <div className="mt-8 grid gap-2">
                            {permissions.canCheckIn ? (
                                <button
                                    type="button"
                                    onClick={() => onOpenCheckIn(invite)}
                                    className="bg-coral px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider"
                                >
                                    Open check-in
                                </button>
                            ) : (
                                <p className="text-sm text-white/55">Check-in is not included in this handler role.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {permissions.canViewSales ? (
                    <Metric label="Gross sales" value={money(sales?.gross_sales || 0)} Icon={BarChart3} />
                ) : null}
                <Metric label="Tickets sold" value={`${sold}${capacity ? ` / ${capacity}` : ''}`} Icon={Ticket} />
                <Metric
                    label="Checked in"
                    value={`${checkIns.claimed_tickets || 0} / ${(checkIns.claimed_tickets || 0) + (checkIns.unclaimed_tickets || 0) || 0}`}
                    Icon={Check}
                />
                <Metric label="Unclaimed" value={checkIns.unclaimed_tickets ?? 0} Icon={ScanLine} />
            </div>

            {ticketTypes.length ? (
                <section className="border border-ink/10 bg-white p-5 sm:p-6">
                    <h3 className="serif text-2xl">Ticket types</h3>
                    <ul className="mt-4 divide-y divide-ink/10">
                        {ticketTypes.map((tier) => (
                            <li key={tier._id || tier.name} className="flex justify-between py-3 text-sm">
                                <span className="font-bold">{tier.name}</span>
                                <span className="text-ink/55">
                                    {money(tier.price)} · {tier.sold || 0}/{tier.quantity || 0}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </section>
    );
}
