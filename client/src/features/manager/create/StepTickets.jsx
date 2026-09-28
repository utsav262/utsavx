import { Plus, Ticket as TicketIcon, AlertCircle, Check } from 'lucide-react';
import { money } from '../../../lib/money.js';
import { formatQty, formatTicketPrice, isNonComplimentary } from '../../tickets/ticketUtils.js';

export default function StepTickets({ tickets, capacity, minPrice, onOpenFlow, busy }) {
  const sellable = tickets.filter(isNonComplimentary);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-coral">
              Event type
            </p>
            <h3 className="serif mt-2 text-3xl leading-none">Tickets</h3>
            <p className="mt-2 max-w-md text-sm text-ink/55">
              Add at least one paid ticket for review. Sales and team allotments will use these tiers.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onOpenFlow}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-coral px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:opacity-90 disabled:opacity-60"
          >
            <Plus size={14} /> {tickets.length ? 'Manage' : 'Add tickets'}
          </button>
        </div>

        {/* Quick stats */}
        {tickets.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Tiers" value={tickets.length} />
            <Stat label="Capacity" value={capacity || '∞'} />
            <Stat label="From" value={money(minPrice)} />
          </div>
        )}

        {/* Validation hint */}
        {!sellable.length && tickets.length > 0 && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-amber-800">
              Add at least one paid ticket before continuing.
            </p>
          </div>
        )}

        {sellable.length > 0 && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
            <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-emerald-800">
              Ready — {sellable.length} sellable tier
              {sellable.length === 1 ? '' : 's'} configured.
            </p>
          </div>
        )}
      </div>

      {/* Ticket list */}
      {tickets.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="border-b border-ink/10 px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
            Tier list
          </div>
          <ul className="divide-y divide-ink/10">
            {tickets.map((ticket) => (
              <li
                key={ticket._id || ticket.name}
                className="flex items-center gap-3 px-5 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral">
                  <TicketIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{ticket.name}</p>
                  <p className="mt-0.5 text-xs text-ink/55">
                    {formatTicketPrice(ticket)} · {formatQty(ticket.quantity)} seats
                  </p>
                </div>
                {!isNonComplimentary(ticket) && (
                  <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Comp
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-cream/40 px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral/10">
            <TicketIcon size={22} className="text-coral" />
          </div>
          <p className="serif mt-4 text-2xl">No tickets yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
            Add tiers with pricing, capacity, and sale windows.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onOpenFlow}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Plus size={14} /> Add first ticket
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-cream/60 px-4 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">
        {label}
      </p>
      <p className="serif mt-0.5 text-2xl leading-none">{value}</p>
    </div>
  );
}
