import { useState } from 'react';
import { LayoutGrid, Clock, CalendarDays, Users, Shield } from 'lucide-react';
import OverviewTab from './views/OverviewTab.jsx';
import PendingTab from './views/PendingTab.jsx';
import EventsTab from './views/EventsTab.jsx';
import UsersTab from './views/UsersTab.jsx';

export default function AdminHome({
  overview,
  events = [],
  pending = [],
  users = [],
  selected,
  onOpen,
  onApprove,
  onReject,
  onSetStatus,
  onToggleFeatured,
  onSetRole,
  onSetPassword,
}) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', Icon: LayoutGrid, title: 'Dashboard overview' },
    { id: 'pending', label: 'Pending review', Icon: Clock, count: pending.length, title: 'Pending review' },
    { id: 'events', label: 'Events', Icon: CalendarDays, count: events.length, title: 'All events' },
    { id: 'users', label: 'Users', Icon: Users, count: users.length, title: 'Users & roles' },
  ];
  const current = tabs.find((t) => t.id === tab);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* ---------- Sidebar ---------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="bg-ink p-4 text-white">
          <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-4">
            <div className="flex h-9 w-9 items-center justify-center bg-coral">
              <Shield size={17} />
            </div>
            <div>
              <p className="text-sm font-extrabold">Admin panel</p>
              <p className="text-[11px] text-white/50">MXO platform</p>
            </div>
          </div>
          <nav className="mt-3 flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map(({ id, label, Icon, count }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex shrink-0 items-center gap-3 px-3 py-2.5 text-left text-sm font-bold transition ${
                    active ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-coral' : ''} />
                  <span className="flex-1">{label}</span>
                  {count != null && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold ${
                        active ? 'bg-coral/15 text-coral' : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <section className="min-w-0 border border-ink/10 bg-white/60 p-5 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-coral">Admin</p>
            <h2 className="serif mt-1 text-4xl">{current.title}</h2>
          </div>
          {pending.length > 0 && tab !== 'pending' && (
            <button
              onClick={() => setTab('pending')}
              className="inline-flex items-center gap-2 bg-amber-100 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-amber-700 hover:bg-amber-200"
            >
              <Clock size={13} /> {pending.length} awaiting approval
            </button>
          )}
        </div>

        {tab === 'overview' && (
          <OverviewTab
            overview={overview}
            onGoToPending={() => setTab('pending')}
            onGoToEvents={() => setTab('events')}
            onGoToUsers={() => setTab('users')}
          />
        )}

        {tab === 'pending' && (
          <PendingTab pending={pending} onOpen={onOpen} onApprove={onApprove} onReject={onReject} />
        )}

        {tab === 'events' && (
          <EventsTab
            events={events}
            selected={selected}
            onOpen={onOpen}
            onSetStatus={onSetStatus}
            onToggleFeatured={onToggleFeatured}
          />
        )}

        {tab === 'users' && (
          <UsersTab users={users} onSetRole={onSetRole} onSetPassword={onSetPassword} />
        )}
      </section>
    </div>
  );
}
