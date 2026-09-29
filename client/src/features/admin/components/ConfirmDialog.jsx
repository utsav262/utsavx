import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const toneMap = {
    danger: 'bg-red-600 hover:bg-red-700',
    primary: 'bg-coral hover:opacity-90',
    neutral: 'bg-ink hover:bg-ink/90',
  };

  const handle = async () => {
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-ink/10 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1">
            <h3 className="serif text-2xl leading-tight">{title}</h3>
            {message && <p className="mt-2 text-sm text-ink/60">{message}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="border border-ink/20 px-4 py-2.5 text-sm font-bold hover:border-ink/40 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handle}
            disabled={busy}
            className={`px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${toneMap[tone] || toneMap.danger}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
