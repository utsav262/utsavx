import { CalendarDays, ScanLine, LayoutDashboard } from 'lucide-react';
import { money } from '../../lib/money.js';
import { formatDateTime } from '../../lib/datetime.js';
import {
    canOpenDashboard,
    canScan,
    canSell,
    eventCover,
    isOwnerLike,
    roleBadge
} from './dashboardUtils.js';

export default function DashboardEventCard({ event, tab, onDashboard, onScan, onSell, onEdit }) {
    const sold = (event.ticketTypes || event.tickets || []).reduce(
        (sum, tier) => sum + Number(tier.sold || 0),
        0
    );
    const capacity = (event.ticketTypes || event.tickets || []).reduce(
        (sum, tier) => sum + Number(tier.quantity || 0),
        0
    );
    const awaitingReview = event.status === 'review_pending';
    const showScan = tab === 'live' && canScan(event) && !awaitingReview;
    const showSell = tab === 'live' && canSell(event) && !awaitingReview;
    const showDashboard = canOpenDashboard(event);
    const showEdit = tab === 'draft' && isOwnerLike(event);

    return (
        <article className="flex flex-col overflow-hidden border border-ink/10 bg-white transition hover:border-ink/25">
            <div className="relative aspect-[16/10] bg-moss">
                <img src={eventCover(event)} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 bg-cream px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]">
                    {(event.status || tab || 'event').replace('_', ' ')}
                </span>
                <span className="absolute right-3 top-3 bg-moss px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
                    {roleBadge(event)}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-butter">
                        {event.category || event.genre || 'Event'}
                    </p>
                    <h3 className="serif mt-1 text-2xl leading-none">{event.title || event.name}</h3>
                </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
                <p className="flex items-center gap-2 text-sm text-ink/60">
                    <CalendarDays size={14} className="text-coral" />
                    {formatDateTime(event.startsAt) || event.date || 'Date TBA'}
                </p>
                <p className="mt-2 text-sm text-ink/55">
                    {event.venue?.city || event.city || event.venue?.name || 'Venue TBA'}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3 text-xs font-bold uppercase tracking-wider text-ink/50">
                    <span>
                        {isOwnerLike(event) || event.event_handler_type === 'Event_Scanner'
                            ? `${money(event.gross_sales || 0)} sales`
                            : `${sold}/${capacity || '—'} sold`}
                    </span>
                    <span>{event.unclaimed_tickets ? `${event.unclaimed_tickets} unclaimed` : '—'}</span>
                </div>

                {awaitingReview ? (
                    <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-coral">
                        Awaiting review
                    </p>
                ) : null}

                <div className="mt-4 grid gap-2">
                    {showScan || showSell ? (
                        <div className="grid grid-cols-2 gap-2">
                            {showScan ? (
                                <button
                                    type="button"
                                    onClick={() => onScan(event)}
                                    className="inline-flex items-center justify-center gap-2 border border-ink/15 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider"
                                >
                                    <ScanLine size={14} /> Scan
                                </button>
                            ) : (
                                <span />
                            )}
                            {showSell ? (
                                <button
                                    type="button"
                                    onClick={() => onSell(event)}
                                    className="inline-flex items-center justify-center gap-2 border border-ink/15 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider"
                                >
                                    Sell
                                </button>
                            ) : (
                                <span />
                            )}
                        </div>
                    ) : null}

                    {showEdit ? (
                        <button
                            type="button"
                            onClick={() => onEdit(event)}
                            className="w-full border border-ink/15 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider"
                        >
                            Edit draft
                        </button>
                    ) : null}

                    {showDashboard ? (
                        <button
                            type="button"
                            onClick={() => onDashboard(event)}
                            className="inline-flex w-full items-center justify-center gap-2 bg-ink px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider text-white"
                        >
                            <LayoutDashboard size={14} /> Dashboard
                        </button>
                    ) : null}
                </div>
            </div>
        </article>
    );
}
