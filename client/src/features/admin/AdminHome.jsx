import { useState } from 'react';
import { LayoutGrid, Clock, CalendarDays, Users } from 'lucide-react';
import TabBar from './components/TabBar.jsx';
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
    { id: 'overview', label: 'Overview', icon: <LayoutGrid size={13} /> },
    { id: 'pending', label: 'Pending', icon: <Clock size={13} />, count: pending.length },
    { id: 'events', label: 'Events', icon: <CalendarDays size={13} />, count: events.length },
    { id: 'users', label: 'Users', icon: <Users size={13} />, count: users.length },
  ];

  return (
    <section className="mt-8">
      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <OverviewTab
          overview={overview}
          onGoToPending={() => setTab('pending')}
          onGoToEvents={() => setTab('events')}
          onGoToUsers={() => setTab('users')}
        />
      )}

      {tab === 'pending' && (
        <PendingTab
          pending={pending}
          onOpen={onOpen}
          onApprove={onApprove}
          onReject={onReject}
        />
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
        <UsersTab
          users={users}
          onSetRole={onSetRole}
          onSetPassword={onSetPassword}
        />
      )}
    </section>
  );
}
