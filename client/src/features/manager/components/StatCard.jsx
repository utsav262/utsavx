import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, Icon, trend, hint, accent = 'coral' }) {
  const accentMap = {
    coral: 'text-coral bg-coral/10',
    moss: 'text-emerald-700 bg-emerald-100',
    ink: 'text-ink bg-ink/10',
    amber: 'text-amber-700 bg-amber-100',
  };
  return (
    <div className="border border-ink/10 bg-white p-5 transition hover:border-ink/25">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center ${accentMap[accent] || accentMap.coral}`}>
          <Icon size={18} />
        </div>
        {trend != null && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold ${
              trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-ink/50">
        {label}
      </p>
      <p className="serif mt-1 text-3xl leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}
