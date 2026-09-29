export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-4">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition ${
              isActive
                ? 'bg-ink text-white'
                : 'border border-ink/15 text-ink/60 hover:border-ink/30 hover:text-ink'
            }`}
          >
            {t.icon && <span className={isActive ? 'text-white' : 'text-coral'}>{t.icon}</span>}
            {t.label}
            {t.count != null && (
              <span
                className={`px-1.5 text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-coral/15 text-coral'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
