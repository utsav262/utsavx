import { CalendarDays } from 'lucide-react';
import { money } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import { EmptyState, eventCover, place, roleLabel } from './staffHelpers.jsx';

function CatalogCard({ invite, active, onOpenDashboard }) {
    const event = invite.event || {};
    const permissions = invite.permissions || {};
    const sold = (event.ticketTypes || []).reduce((sum, tier) => sum + Number(tier.sold || 0), 0);
    const capacity = (event.ticketTypes || []).reduce((sum, tier) => sum + Number(tier.quantity || 0), 0);
    const prices = (event.ticketTypes || []).map((tier) => Number(tier.price)).filter((n) => !Number.isNaN(n));
    const from = prices.length ? Math.min(...prices) : Infinity;
    const status = event.status || 'draft';
    const canOpen = permissions.canViewDashboard !== false;

    return (
        <article
            className={`group overflow-hidden border bg-white transition ${
                active ? 'border-coral shadow-[0_12px_40px_rgba(232,93,76,0.12)]' : 'border-ink/10 hover:border-ink/25'
            }`}
        >
            <button
                type="button"
                disabled={!canOpen}
                onClick={() => canOpen && onOpenDashboard(invite)}
                className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
            >
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
                    <span className="absolute right-3 top-3 bg-moss px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
                        {roleLabel(invite.userType)}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-butter">
                            {event.category || 'Event'}
                        </p>
                        <h3 className="serif mt-1 text-2xl leading-none">{event.title || 'Event'}</h3>
                    </div>
                </div>
                <div className="space-y-3 p-4">
                    <p className="flex items-center gap-2 text-sm text-ink/60">
                        <CalendarDays size={14} className="text-coral" />
                        {formatDateTime(event.startsAt) || 'Date TBA'}
                    </p>
                    <p className="text-sm text-ink/55">{place(event)}</p>
                    <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-xs font-bold uppercase tracking-wider text-ink/50">
                        <span>{sold}/{capacity || '—'} sold</span>
                        <span>{Number.isFinite(from) ? `from ${money(from)}` : 'Free / TBA'}</span>
                    </div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink/40">
                        {permissions.canCheckIn ? 'Check-in' : 'No check-in'}
                        {permissions.canViewSales ? ' · Sales' : ''}
                        {permissions.canSell ? ' · Sell' : ''}
                    </p>
                </div>
            </button>
            <button
                type="button"
                disabled={!canOpen}
                onClick={() => canOpen && onOpenDashboard(invite)}
                className="w-full border-t border-ink/10 bg-ink px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-50"
            >
                {canOpen ? 'Open dashboard' : 'No dashboard access'}
            </button>
        </article>
    );
}

export default function StaffEvents({ accepted, selectedId, onOpenDashboard }) {
    return (
        <section>
            <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Your catalog</p>
                    <h2 className="serif mt-2 text-4xl leading-none sm:text-5xl">Events</h2>
                    <p className="mt-3 text-sm text-ink/55">
                        {accepted.length} event{accepted.length === 1 ? '' : 's'} · dashboard access follows your handler role
                    </p>
                </div>
            </div>

            {!accepted.length ? (
                <EmptyState
                    title="No events yet"
                    body="Accept a pending invitation and the event will appear here in your catalog."
                />
            ) : (
                <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {accepted.map((invite) => (
                        <CatalogCard
                            key={invite._id}
                            invite={invite}
                            active={selectedId === invite._id}
                            onOpenDashboard={onOpenDashboard}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
