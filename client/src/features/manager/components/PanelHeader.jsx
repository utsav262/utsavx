export default function PanelHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">
            {eyebrow}
          </p>
        )}
        <h2 className="serif mt-2 text-4xl leading-none">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-ink/55">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
