import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

export default function AdminStat({ label, value, Icon, trend, hint, accent = 'coral', onClick }) {
  const accentMap = {
    coral: 'bg-coral/10 text-coral',
    moss: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    ink: 'bg-ink/10 text-ink',
    purple: 'bg-purple-100 text-purple-700',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`group relative overflow-hidden border border-ink/10 bg-white p-5 text-left transition ${
        onClick ? 'hover:border-coral hover:shadow-sm' : ''
      }`}
    >
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
        {onClick && (
          <ArrowUpRight
            size={14}
            className="text-ink/30 transition group-hover:text-coral"
          />
        )}
      </div>
      <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-ink/50">
        {label}
      </p>
      <p className="serif mt-1 text-3xl leading-none">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink/45">{hint}</p>}
    </Wrapper>
  );
}
