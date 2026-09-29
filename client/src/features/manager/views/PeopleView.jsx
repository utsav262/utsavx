import { useState } from 'react';
import { Plus, Mail, Users as UsersIcon } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import PanelHeader from '../components/PanelHeader.jsx';
import { apiClient } from '../../../api/index.js';

export default function PeopleView({ event, data = {}, reload, notice }) {
  const [guest, setGuest] = useState({ name: '', email: '' });
  const [handler, setHandler] = useState({ email: '', type: 'Event_Scanner' });

  if (!event) return <p className="mt-8 text-sm text-ink/55">Select an event first.</p>;

  const addGuest = async (e) => {
    e.preventDefault();
    try {
      await apiClient.managerCreateGuest({ ...guest, eventId: event._id });
      setGuest({ name: '', email: '' });
      notice?.('Guest added.', 'success');
      reload?.();
    } catch (error) {
      notice?.(error.response?.data?.message || 'Guest could not be added.', 'error');
    }
  };

  const addHandler = async (e) => {
    e.preventDefault();
    try {
      await apiClient.managerAddHandler({ ...handler, eventId: event._id });
      setHandler({ email: '', type: 'Event_Scanner' });
      notice?.('Team invite created.', 'success');
      reload?.();
    } catch (error) {
      notice?.(error.response?.data?.message || 'Team invite failed.', 'error');
    }
  };

  const teamRows = (data.handlers || []).map((row) => ({
    ...row,
    role:
      row.userType === 'Event_Scanner' ? 'Event Scanner'
      : row.userType === 'Manager' ? 'Event Manager'
      : row.userType || 'Staff',
    status:
      row.invitationStatus === 'A' ? 'Accepted'
      : row.invitationStatus === 'D' ? 'Declined'
      : 'Pending',
  }));

  return (
    <div className="mt-6 space-y-8">
      <PanelHeader
        eyebrow="Access"
        title="Guests & team"
        subtitle="Invite guests and assign scanners or managers."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Guests */}
        <div className="border border-ink/10 bg-white p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <UsersIcon size={16} className="text-coral" /> Guests
          </h3>
          <form onSubmit={addGuest} className="mt-3 flex flex-wrap gap-2">
            <input
              required
              placeholder="Name"
              value={guest.name}
              onChange={(e) => setGuest({ ...guest, name: e.target.value })}
              className="min-w-0 flex-1 border border-ink/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-coral"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={guest.email}
              onChange={(e) => setGuest({ ...guest, email: e.target.value })}
              className="min-w-0 flex-1 border border-ink/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-coral"
            />
            <button className="bg-ink px-4 py-2 text-white hover:opacity-90">
              <Plus size={15} />
            </button>
          </form>
          <div className="mt-4">
            <DataTable rows={data.guests || []} columns={['name', 'email', 'status']} searchable={false} emptyText="No guests yet." />
          </div>
        </div>

        {/* Team */}
        <div className="border border-ink/10 bg-white p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Mail size={16} className="text-coral" /> Team
          </h3>
          <form onSubmit={addHandler} className="mt-3 flex flex-wrap gap-2">
            <input
              required
              type="email"
              placeholder="email@example.com"
              value={handler.email}
              onChange={(e) => setHandler({ ...handler, email: e.target.value })}
              className="min-w-0 flex-1 border border-ink/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-coral"
            />
            <button className="bg-ink px-4 py-2 text-white hover:opacity-90">
              <Plus size={15} />
            </button>
          </form>
          <div className="mt-4">
            <DataTable rows={teamRows} columns={['email', 'role', 'status']} searchable={false} emptyText="No team members yet." />
          </div>
        </div>
      </div>
    </div>
  );
}
