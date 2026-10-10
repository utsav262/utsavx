export default function Section({ icon, title, hint, children }) {
  return (
    <div className="border border-ink/10 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h3 className="flex items-center gap-2 serif text-2xl leading-none">
          {icon && <span className="text-coral">{icon}</span>}
          {title}
        </h3>
        {hint && <span className="text-right text-xs text-ink/45">{hint}</span>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

/** Selectable card used for organizer type, format, visibility and similar single-choice pickers. */
export function ChoiceCard({ active, onClick, icon, title, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-full w-full items-start gap-3 border p-3.5 text-left transition ${
        active ? 'border-coral bg-coral/5' : 'border-ink/15 hover:border-ink/30'
      }`}
    >
      {icon && <span className={`mt-0.5 shrink-0 ${active ? 'text-coral' : 'text-ink/45'}`}>{icon}</span>}
      <span className="min-w-0">
        <span className={`block text-sm font-bold ${active ? 'text-coral' : 'text-ink/80'}`}>{title}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink/50">{hint}</span>}
      </span>
    </button>
  );
}
