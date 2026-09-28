export default function Field({
  label,
  hint,
  error,
  required,
  children,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <label className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/55">
          <span>
            {label}
            {required && <span className="ml-1 text-coral">*</span>}
          </span>
          {hint && <span className="text-ink/35 normal-case tracking-normal">{hint}</span>}
        </label>
      )}
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p>}
    </div>
  );
}

export const inputCls =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/10 placeholder:text-ink/35';

export const inputSerifCls =
  'w-full rounded-xl border border-ink/15 bg-white px-4 py-3 serif text-3xl outline-none transition focus:border-coral focus:ring-4 focus:ring-coral/10 placeholder:text-ink/30';
