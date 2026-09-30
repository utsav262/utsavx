import { Plus, CalendarDays, Coins, Ticket, BarChart3 } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import EventTile from '../components/EventTile.jsx';
import PanelHeader from '../components/PanelHeader.jsx';
import { money } from '../../../lib/money.js';

export default function ManagerHome({ dashboard, events = [], onCreate, onOpenDashboard, onOpenEvent }) {
  const revenue = dashboard?.revenue || {};

  return (
    <section className="mt-8 space-y-12">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={money(revenue.total || 0)} Icon={Coins} hint="All-time earnings" />
        <StatCard label="Tickets sold" value={revenue.tickets_sold || 0} Icon={Ticket} accent="moss" hint="Confirmed bookings" />
        <StatCard label="Capacity" value={revenue.ticket_cap || 0} Icon={BarChart3} accent="amber" hint="Total inventory" />
        <StatCard label="Live events" value={dashboard?.events?.live?.total || 0} Icon={CalendarDays} hint="Currently selling" />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreate}
          className="group flex items-center gap-4 border border-ink/10 bg-gradient-to-br from-coral/5 to-white p-6 text-left transition hover:border-coral"
        >
          <div className="flex h-12 w-12 items-center justify-center bg-coral text-white">
            <Plus size={22} />
          </div>
          <div className="flex-1">
            <p className="serif text-2xl">Create event</p>
            <p className="mt-1 text-sm text-ink/55">
              Start a new draft, add tickets and team, then submit for approval.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenDashboard}
          className="group flex items-center gap-4 border border-ink/10 bg-white p-6 text-left transition hover:border-coral"
        >
          <div className="flex h-12 w-12 items-center justify-center bg-ink text-white">
            <CalendarDays size={22} />
          </div>
          <div className="flex-1">
            <p className="serif text-2xl">Full dashboard</p>
            <p className="mt-1 text-sm text-ink/55">
              View Live / Past / Draft events and open each event dashboard.
            </p>
          </div>
        </button>
      </div>

      {/* Recent events */}
      <div>
        <PanelHeader
          eyebrow="Your events"
          title="Recent events"
          subtitle={`${events.length} event${events.length === 1 ? '' : 's'}`}
        />

        {events.length ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {events.slice(0, 6).map((e) => (
              <EventTile key={e._id || e.id} event={e} onOpen={onOpenEvent} />
            ))}
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-ink/20 px-6 py-16 text-center">
            <p className="serif text-3xl">No events yet</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink/55">
              Create your first event to sell tickets, invite team, and open the door.
            </p>
            <button onClick={onCreate} className="mt-6 inline-flex items-center gap-2 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white">
              <Plus size={14} /> Create event
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
