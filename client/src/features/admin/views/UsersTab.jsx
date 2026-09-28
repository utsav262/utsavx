import { useMemo, useState } from 'react';
import { Search, Mail, ShieldCheck } from 'lucide-react';
import RoleSelect from '../components/RoleSelect.jsx';
import PasswordCell from '../components/PasswordCell.jsx';

const ROLE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admins' },
  { value: 'organizer', label: 'Organizers' },
  { value: 'customer', label: 'Customers' },
];

const ROLE_TONES = {
  admin: 'bg-purple-100 text-purple-700',
  organizer: 'bg-coral/15 text-coral',
  customer: 'bg-emerald-100 text-emerald-700',
};

export default function UsersTab({ users = [], onSetRole, onSetPassword }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let rows = users;
    if (filter !== 'all') rows = rows.filter((u) => u.role === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((u) =>
        `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [users, filter, query]);

  return (
    <div className="mt-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink/15 bg-white px-3.5 py-2.5">
          <Search size={15} className="text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name or email"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider transition ${
              filter === f.value
                ? 'bg-ink text-white'
                : 'border border-ink/15 text-ink/60 hover:border-ink/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-ink/55">No users match.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-ink/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    User
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Role
                  </th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
                    Password
                  </th>
                  <th className="w-px px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user._id} className="border-t border-ink/10 hover:bg-cream/50">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${ROLE_TONES[user.role] || 'bg-ink/10'}`}>
                          {(user.name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">{user.name || '—'}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-ink/55">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <RoleSelect user={user} onChange={onSetRole} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <PasswordCell user={user} onSetPassword={onSetPassword} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      {user.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-700">
                          <ShieldCheck size={10} /> Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-ink/45">
        Showing {filtered.length} of {users.length} users
      </p>
    </div>
  );
}
