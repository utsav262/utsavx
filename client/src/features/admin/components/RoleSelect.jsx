import { useState } from 'react';
import { Shield, User, UserCog, ChevronDown } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog.jsx';

const ROLES = [
  { value: 'customer', label: 'Customer', Icon: User, tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'organizer', label: 'Organizer', Icon: UserCog, tone: 'bg-coral/15 text-coral' },
  { value: 'admin', label: 'Admin', Icon: Shield, tone: 'bg-purple-100 text-purple-700' },
];

export default function RoleSelect({ user, onChange }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const current = ROLES.find((r) => r.value === user.role) || ROLES[0];

  const confirm = async () => {
    await onChange?.(user._id, pending);
    setPending(null);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider ${current.tone}`}
        >
          <current.Icon size={12} />
          {current.label}
          <ChevronDown size={11} className="opacity-60" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden border border-ink/10 bg-white shadow-xl">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setOpen(false);
                    if (r.value !== user.role) setPending(r.value);
                  }}
                  disabled={r.value === user.role}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition hover:bg-cream ${
                    r.value === user.role ? 'opacity-40' : ''
                  }`}
                >
                  <r.Icon size={13} />
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={`Change role to ${pending}?`}
        message={`Changing role for ${user.name || user.email} to ${pending} will adjust their permissions.`}
        confirmLabel="Change role"
        tone="primary"
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
