import { useState } from 'react';
import { Plus, Trash2, Users, Mail, User, Crown } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';
import Section from './Section.jsx';
import { isNonComplimentary } from '../../tickets/ticketUtils.js';

/** Team roles map 1:1 onto the server's EventHandler user types. */
export const TEAM_ROLES = [
  { type: 'Manager', label: 'Event manager / coordinator', can: 'Runs tickets, team, promo codes, sales and check-in. Cannot edit event details or invite other managers.' },
  { type: 'Event_Scanner', label: 'Gate staff / volunteer', can: 'Scans tickets at entry. Optionally sells at the gate.' },
  { type: 'Ambassador', label: 'Ticket ambassador', can: 'Sells an allotted number of tickets and earns commission.', needsTickets: true },
  { type: 'Outlet', label: 'Ticket outlet', can: 'A shop or desk that sells an allotted number of tickets.', needsTickets: true },
];
const roleOf = (type) => TEAM_ROLES.find((role) => role.type === type) || TEAM_ROLES[1];
const STATUS = { P: 'Invite pending', A: 'Accepted', D: 'Declined' };
const emptyMember = { email: '', type: 'Event_Scanner', scannerPermission: 'scan_only', ticketId: '', quantity: '10' };

export default function StepPeople({ owner, team, setTeam, guests, setGuests, tickets, notice, newKey }) {
  const [guestDraft, setGuestDraft] = useState({ name: '', email: '' });
  const [member, setMember] = useState(emptyMember);
  const role = roleOf(member.type);
  const savedTickets = tickets.filter((t) => t._id && isNonComplimentary(t));

  const addGuest = () => {
    const name = guestDraft.name.trim();
    const email = guestDraft.email.trim().toLowerCase();
    if (!name) return notice('Guest name is required.');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return notice('Guest email looks invalid.');
    setGuests((rows) => [...rows, { key: newKey(), name, email }]);
    setGuestDraft({ name: '', email: '' });
    notice('');
  };

  const addMember = () => {
    const email = member.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return notice('Enter a valid team email.');
    if (owner?.email && email === owner.email.toLowerCase()) return notice('You already own this event.');
    if (team.some((row) => row.email === email && row.status !== 'D')) return notice(`${email} is already on the team.`);
    let allotments = [];
    if (role.needsTickets) {
      const quantity = Math.floor(Number(member.quantity));
      if (!member.ticketId) return notice('Pick which ticket tier they will sell.');
      if (!(quantity > 0)) return notice('Allotted quantity must be at least 1.');
      allotments = [{ ticketTypeId: member.ticketId, quantity }];
    }
    setTeam((rows) => [
      ...rows,
      {
        key: newKey(),
        email,
        type: member.type,
        scannerPermission: member.type === 'Event_Scanner' ? member.scannerPermission : undefined,
        allotments,
      },
    ]);
    setMember({ ...emptyMember, type: member.type });
    notice('');
  };

  return (
    <div className="space-y-8">
      <Section icon={<Crown size={15} />} title="Event owner">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-extrabold text-white">
            {(owner?.name || owner?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{owner?.name || owner?.email || 'You'}</p>
            <p className="text-xs text-ink/55">Full control — edits details, invites managers, receives payouts.</p>
          </div>
        </div>
      </Section>

      <Section icon={<Mail size={15} />} title="Team & permissions" hint={`${team.length} on team`}>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            type="email"
            className={inputCls}
            placeholder="team@example.com"
            value={member.email}
            onChange={(e) => setMember({ ...member, email: e.target.value })}
          />
          <select className={inputCls} value={member.type} onChange={(e) => setMember({ ...member, type: e.target.value })}>
            {TEAM_ROLES.map((row) => (
              <option key={row.type} value={row.type} disabled={row.needsTickets && !savedTickets.length}>
                {row.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-ink/55">{role.can}</p>

        {member.type === 'Event_Scanner' && (
          <Field label="Gate permissions">
            <select
              className={inputCls}
              value={member.scannerPermission}
              onChange={(e) => setMember({ ...member, scannerPermission: e.target.value })}
            >
              <option value="scan_only">Scan tickets only</option>
              <option value="both">Scan and sell at the gate</option>
              <option value="sell_only">Sell at the gate only</option>
            </select>
          </Field>
        )}
        {role.needsTickets && (
          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
            <select className={inputCls} value={member.ticketId} onChange={(e) => setMember({ ...member, ticketId: e.target.value })}>
              <option value="">Ticket tier to sell…</option>
              {savedTickets.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              className={inputCls}
              placeholder="Qty"
              value={member.quantity}
              onChange={(e) => setMember({ ...member, quantity: e.target.value })}
            />
          </div>
        )}
        {!savedTickets.length && (
          <p className="text-xs text-ink/45">Ambassadors and outlets become available once tickets are added.</p>
        )}
        <button
          type="button"
          onClick={addMember}
          className="w-full bg-ink px-5 py-3 text-sm font-bold text-white hover:opacity-90 sm:w-auto"
        >
          Add to team
        </button>

        {team.length > 0 ? (
          <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
            {team.map((row) => (
              <li key={row.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/10">
                  <User size={14} className="text-ink/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{row.email}</p>
                  <p className="text-xs text-ink/55">
                    {roleOf(row.type).label}
                    {row._id ? ` · ${STATUS[row.status] || 'Invited'}` : ' · Invite sent when you save'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${row.email}`}
                  onClick={() => setTeam((rows) => rows.filter((r) => r.key !== row.key))}
                  className="p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">
            No team yet — coordinators, volunteers and gate staff go here.
          </p>
        )}
      </Section>

      <Section icon={<Users size={15} />} title="Guests & speakers" hint={`${guests.length} added`}>
        <p className="text-xs text-ink/55">
          Shown by name as the lineup on public events, hidden on private ones. Emails are never shown publicly.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputCls}
            placeholder="Name"
            value={guestDraft.name}
            onChange={(e) => setGuestDraft({ ...guestDraft, name: e.target.value })}
          />
          <input
            type="email"
            className={inputCls}
            placeholder="Email (optional)"
            value={guestDraft.email}
            onChange={(e) => setGuestDraft({ ...guestDraft, email: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGuest())}
          />
          <button type="button" onClick={addGuest} aria-label="Add guest" className="shrink-0 bg-ink px-5 py-3 text-sm font-bold text-white hover:opacity-90">
            <Plus size={16} />
          </button>
        </div>

        {guests.length > 0 ? (
          <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
            {guests.map((g) => (
              <li key={g.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-xs font-extrabold text-coral">
                  {(g.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{g.name}</p>
                  {g.email && <p className="truncate text-xs text-ink/55">{g.email}</p>}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${g.name}`}
                  onClick={() => setGuests((rows) => rows.filter((r) => r.key !== g.key))}
                  className="p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">No guests yet — optional.</p>
        )}
      </Section>
    </div>
  );
}
