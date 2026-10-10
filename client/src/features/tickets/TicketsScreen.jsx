import { Pencil, Plus, Trash2 } from 'lucide-react';
import { formatAdmits, formatQty, formatTicketPrice, isEditableTicket, isNonComplimentary, isSystemComplimentary, peopleCapacity } from './ticketUtils.js';

export default function TicketsScreen({
    tickets = [],
    eventTitle = 'Event',
    onBack,
    onAdd,
    onEdit,
    onDelete,
    busy,
    context = {}
}) {
    const sellable = tickets.filter(isNonComplimentary);
    const unlimited = sellable.some((t) => peopleCapacity(t) === null);
    const people = sellable.reduce((sum, t) => sum + (peopleCapacity(t) || 0), 0);
    return (
        <section className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <button
                        type="button"
                        onClick={onBack}
                        className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50"
                    >
                        ← Event type
                    </button>
                    <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Tickets</p>
                    <h2 className="serif mt-2 text-4xl">{eventTitle}</h2>
                    <p className="mt-2 text-sm text-ink/55">
                        Add paid or free tiers. Door price unlocks gate sell later.
                    </p>
                    {sellable.length > 0 && (
                        <p className="mt-2 text-sm font-bold text-ink/70">
                            Admits {unlimited ? 'unlimited' : people} people
                            {context.maxPeople != null ? ` · event maximum ${context.maxPeople}` : ''}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    disabled={busy}
                    className="inline-flex items-center gap-2 bg-coral px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                >
                    <Plus size={14} /> Add
                </button>
            </div>

            <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {tickets.map((ticket) => {
                    const locked = !isEditableTicket(ticket);
                    return (
                        <li key={ticket._id || ticket.name} className="flex items-center justify-between gap-3 py-4">
                            <div className="min-w-0">
                                <p className="font-bold">{ticket.name}</p>
                                <p className="mt-1 text-sm text-ink/55">
                                    {formatTicketPrice(ticket)} · {formatQty(ticket.quantity)}
                                    {formatAdmits(ticket.admits) ? ` · ${formatAdmits(ticket.admits)}` : ''}
                                    {Number(ticket.doorPrice || ticket.door_price) > 0
                                        ? ` · door ${formatTicketPrice({ price: ticket.doorPrice || ticket.door_price, ticketType: 'paid' })}`
                                        : ''}
                                    {ticket.includesLunch ? ' · lunch' : ''}
                                    {isSystemComplimentary(ticket) ? ' · system' : ''}
                                </p>
                            </div>
                            {locked ? (
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40">
                                    Locked
                                </span>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(ticket)}
                                        className="border border-ink/15 p-2 text-ink/60 hover:text-ink"
                                        aria-label="Edit ticket"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(ticket)}
                                        className="border border-ink/15 p-2 text-ink/60 hover:text-coral"
                                        aria-label="Delete ticket"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
                {!tickets.length ? (
                    <li className="py-10 text-center text-sm text-ink/50">
                        No tickets yet. Tap + to add your first tier.
                    </li>
                ) : null}
            </ul>
        </section>
    );
}
