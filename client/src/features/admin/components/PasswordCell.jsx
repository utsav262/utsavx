import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Check, X, ShieldCheck } from 'lucide-react';

export default function PasswordCell({ user, onSetPassword }) {
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft.trim().length < 8 || saving) return;
    setSaving(true);
    try {
      await onSetPassword?.(user._id, draft.trim());
      setDraft('');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft('');
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Min 8 chars"
          className="min-w-[120px] flex-1 border border-ink/15 bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none focus:border-coral"
          autoComplete="new-password"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saving || draft.trim().length < 8}
          className="bg-coral p-1.5 text-white disabled:opacity-40"
          aria-label="Save"
        >
          <Check size={13} />
        </button>
        <button
          onClick={cancel}
          className="border border-ink/15 p-1.5 text-ink/60 hover:text-ink"
          aria-label="Cancel"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.password ? (
        <>
          <code className="bg-ink/5 px-2 py-1 font-mono text-xs">
            {visible ? user.password : '••••••••'}
          </code>
          <button
            onClick={() => setVisible((v) => !v)}
            className="text-ink/40 hover:text-coral"
            aria-label="Toggle visibility"
          >
            {visible ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </>
      ) : (
        <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
          <ShieldCheck size={10} /> Hashed
        </span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-coral hover:underline"
      >
        <KeyRound size={11} /> Set
      </button>
    </div>
  );
}
