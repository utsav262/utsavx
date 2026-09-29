import {
  Shield, Users, CalendarDays, Coins, Ticket, Star,
  ArrowRight, UserCog, AlertCircle, Check
} from 'lucide-react';
import AdminStat from '../components/AdminStat.jsx';
import { money } from '../../../lib/money.js';

export default function OverviewTab({ overview, onGoToPending, onGoToEvents, onGoToUsers }) {
  if (!overview) {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse bg-ink/5" />
        ))}
      </div>
    );
  }

  const pendingCount = overview.events?.pending || 0;

  return (
    <div className="mt-8 space-y-10">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label="Platform revenue"
          value={money(overview.revenue || 0)}
          Icon={Coins}
          hint="All-time gross"
          onClick={onGoToEvents}
        />
        <AdminStat
          label="Paid orders"
          value={overview.orders || 0}
          Icon={Ticket}
          accent="moss"
          hint="Confirmed bookings"
        />
        <AdminStat
          label="All events"
          value={overview.events?.total || 0}
          Icon={CalendarDays}
          accent="amber"
          hint={`${overview.events?.byStatus?.published || 0} published`}
          onClick={onGoToEvents}
        />
        <AdminStat
          label="Users"
          value={overview.users?.total || 0}
          Icon={Users}
          accent="purple"
          hint={`${overview.users?.organizer || 0} organizers`}
          onClick={onGoToUsers}
        />
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <button
          onClick={onGoToPending}
          className="group flex w-full items-center gap-4 border border-amber-200 bg-amber-50 p-5 text-left transition hover:border-amber-300"
        >
          <div className="flex h-12 w-12 items-center justify-center bg-amber-500 text-white">
            <AlertCircle size={22} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold uppercase tracking-wider text-amber-700">
              Action needed
            </p>
            <p className="serif mt-1 text-2xl">
              {pendingCount} event{pendingCount === 1 ? '' : 's'} waiting for approval
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-amber-600 transition group-hover:translate-x-1" />
        </button>
      )}

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Access */}
        <div className="border border-ink/10 bg-white p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-purple-100 text-purple-700">
              <Shield size={15} />
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-purple-700">
              Full platform control
            </p>
          </div>
          <h3 className="serif mt-4 text-3xl leading-tight">
            Everything at your fingertips
          </h3>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              'Approve or reject every event submission',
              'Publish, unpublish, feature, or cancel any event',
              'Open any organizer dashboard (sales, tickets, check-in)',
              'Change user roles: customer, organizer, admin',
              'Set or reset passwords for any user',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 border-t border-ink/10 pt-3 first:border-0 first:pt-0">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
                <span className="text-ink/70">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Snapshot */}
        <div className="border border-ink/10 bg-white p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-coral/10 text-coral">
              <Star size={15} />
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">
              Live snapshot
            </p>
          </div>
          <h3 className="serif mt-4 text-3xl leading-tight">
            Platform at a glance
          </h3>

          <dl className="mt-6 space-y-3 text-sm">
            <SnapshotRow
              label="Pending review"
              value={overview.events?.pending || 0}
              accent={pendingCount > 0 ? 'text-amber-600' : ''}
            />
            <SnapshotRow label="Published" value={overview.events?.byStatus?.published || 0} />
            <SnapshotRow label="Featured" value={overview.events?.featured || 0} />
            <SnapshotRow label="Organizers" value={overview.users?.organizer || 0} />
            <SnapshotRow label="Customers" value={overview.users?.customer || 0} />
          </dl>

          <button
            onClick={onGoToPending}
            className="mt-6 inline-flex items-center gap-2 bg-coral px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white hover:opacity-90"
          >
            <Shield size={13} /> Review queue
          </button>
        </div>
      </div>

      {/* Extra stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStat
          label="Organizers"
          value={overview.users?.organizer || 0}
          Icon={UserCog}
          accent="coral"
          onClick={onGoToUsers}
        />
        <AdminStat
          label="Pending"
          value={pendingCount}
          Icon={AlertCircle}
          accent="amber"
          onClick={onGoToPending}
        />
        <AdminStat
          label="Live published"
          value={overview.events?.byStatus?.published || 0}
          Icon={CalendarDays}
          accent="moss"
        />
      </div>
    </div>
  );
}

function SnapshotRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 pb-3 last:border-0 last:pb-0">
      <dt className="text-ink/50">{label}</dt>
      <dd className={`font-bold ${accent || ''}`}>{value}</dd>
    </div>
  );
}
