import { useState } from 'react';
import { AlertCircle, X, CheckCircle2 } from 'lucide-react';

export default function Notice({ message, tone = 'info', onDismiss }) {
  const [hidden, setHidden] = useState(false);
  if (!message || hidden) return null;

  const toneMap = {
    info: 'border-coral/20 bg-coral/5 text-ink',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-700',
  };
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`mt-5 flex items-start gap-3 border px-4 py-3 text-sm ${toneMap[tone] || toneMap.info}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          onDismiss?.();
        }}
        className="p-1 text-ink/40 hover:text-ink"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
