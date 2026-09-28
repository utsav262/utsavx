import { useState } from 'react';
import { Plus, Trash2, Users, Mail, User } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';

export default function StepPeople({ guests, setGuests, handlers, setHandlers, notice }) {
  const [guestDraft, setGuestDraft] = useState({ name: '', email: '' });
  const [handlerDraft, setHandlerDraft] = useState({ email: '', type: 'staff' });

  const addGuest = () => {
    if (!guestDraft.name.trim() || !guestDraft.email.trim()) {
      return notice('Guest name and email are required.');
    }
    setGuests((rows) => [...rows, { ...guestDraft }]);
    setGuestDraft({ name: '', email: '' });
    notice('');
  };

  const addHandler = () => {
    if (!handlerDraft.email.trim()) {
      return notice('Team email is required.');
    }
    setHandlers((rows) => [...rows, { ...handlerDraft }]);
    setHandlerDraft({ email: '', type: 'staff' });
    notice('');
  };

  return (
    <div className="space-y-8">
      {/* Guests */}
      <Section
        icon={<Users size={15} />}
        title="Featured guests"
        hint={`${guests.length} added`}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className={inputCls}
            placeholder="Guest name"
            value={guestDraft.name}
            onChange={(e) => setGuestDraft({ ...guestDraft, name: e.target.value })}
          />
          <input
            type="email"
            className={inputCls}
            placeholder="Email"
            value={guestDraft.email}
            onChange={(e) => setGuestDraft({ ...guestDraft, email: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGuest())}
          />
          <button
            type="button"
            onClick={addGuest}
            className="shrink-0 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            <Plus size={16} />
          </button>
        </div>

        {guests.length > 0 ? (
          <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
            {guests.map((g, i) => (
              <li key={`${g.email}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-xs font-extrabold text-coral">
                  {(g.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{g.name}</p>
                  <p className="truncate text-xs text-ink/55">{g.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGuests((rows) => rows.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">
            No guests yet — optional.
          </p>
        )}
      </Section>

      {/* Team */}
      <Section
        icon={<Mail size={15} />}
        title="Team invites"
        hint={`${handlers.length} invited`}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            className={inputCls}
            placeholder="team@example.com"
            value={handlerDraft.email}
            onChange={(e) => setHandlerDraft({ ...handlerDraft, email: e.target.value })}
          />
          <select
            className={inputCls}
            value={handlerDraft.type}
            onChange={(e) => setHandlerDraft({ ...handlerDraft, type: e.target.value })}
          >
            <option value="staff">Staff</option>
            <option value="ambassador">Ambassador</option>
            <option value="outlet">Outlet</option>
          </select>
          <button
            type="button"
            onClick={addHandler}
            className="shrink-0 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Invite
          </button>
        </div>

        {handlers.length > 0 ? (
          <ul className="divide-y divide-ink/10 rounded-xl border border-ink/10 bg-white">
            {handlers.map((h, i) => (
              <li key={`${h.email}-${i}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/10">
                  <User size={14} className="text-ink/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{h.email}</p>
                  <p className="text-xs capitalize text-ink/55">{h.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHandlers((rows) => rows.filter((_, idx) => idx !== i))}
                  className="rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">
            No team invites yet.
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ icon, title, hint, children }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 serif text-2xl leading-none">
          <span className="text-coral">{icon}</span>
          {title}
        </h3>
        {hint && <span className="text-xs text-ink/45">{hint}</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
