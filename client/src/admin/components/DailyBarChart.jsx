import { useId, useMemo, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';

const H = 180;
const PAD = { top: 12, right: 8, bottom: 26, left: 52 };

function niceMax(value) {
    if (value <= 0) return 1;
    const exp = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / exp) * exp;
}

const shortDate = (iso) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Single-series daily bar chart. One brand color (validated in light + dark), recessive grid,
 * per-bar hover/focus tooltip, and a table view so values never depend on hovering.
 */
export default function DailyBarChart({ title, rows, valueKey, format = (v) => String(v), total }) {
    const [hover, setHover] = useState(null);
    const [asTable, setAsTable] = useState(false);
    const [width, setWidth] = useState(640);
    const titleId = useId();

    const max = useMemo(() => niceMax(Math.max(0, ...rows.map((r) => Number(r[valueKey]) || 0))), [rows, valueKey]);
    const innerW = Math.max(1, width - PAD.left - PAD.right);
    const innerH = H - PAD.top - PAD.bottom;
    const slot = innerW / Math.max(1, rows.length);
    const barW = Math.max(1, Math.min(28, slot - 2)); // 2px surface gap between bars
    const y = (v) => PAD.top + innerH - (v / max) * innerH;
    const ticks = [0, max / 2, max];
    const labelEvery = Math.max(1, Math.ceil(rows.length / 8));
    const active = hover != null ? rows[hover] : null;

    return (
        <section className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1b1b1b]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 id={titleId} className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55 dark:text-white/60">
                        {title}
                    </h3>
                    {total != null ? <p className="serif mt-1 text-3xl">{total}</p> : null}
                </div>
                <button
                    type="button"
                    onClick={() => setAsTable((v) => !v)}
                    className="inline-flex items-center gap-1.5 border border-ink/15 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink/60 hover:border-coral dark:border-white/15 dark:text-white/60"
                    aria-pressed={asTable}
                >
                    {asTable ? <><BarChart3 size={12} /> Chart</> : <><Table2 size={12} /> Table</>}
                </button>
            </div>

            {asTable ? (
                <div className="mt-4 max-h-64 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-ink/45 dark:text-white/45">
                                <th className="py-2 font-extrabold">Date</th>
                                <th className="py-2 text-right font-extrabold">{title}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.date} className="border-t border-ink/10 dark:border-white/10">
                                    <td className="py-1.5">{shortDate(row.date)}</td>
                                    <td className="py-1.5 text-right font-bold tabular-nums">{format(row[valueKey] || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div
                    className="relative mt-4"
                    ref={(node) => {
                        if (node && Math.abs(node.clientWidth - width) > 4) setWidth(node.clientWidth);
                    }}
                >
                    <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-labelledby={titleId}>
                        {ticks.map((t) => (
                            <g key={t}>
                                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-ink/10 dark:stroke-white/10" strokeWidth="1" />
                                <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-ink/45 text-[10px] dark:fill-white/45">
                                    {format(t)}
                                </text>
                            </g>
                        ))}
                        {rows.map((row, i) => {
                            const value = Number(row[valueKey]) || 0;
                            const x = PAD.left + i * slot + (slot - barW) / 2;
                            return (
                                <g key={row.date}>
                                    {hover === i ? (
                                        <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={innerH} className="fill-ink/5 dark:fill-white/5" />
                                    ) : null}
                                    {value > 0 ? (
                                        <rect
                                            x={x}
                                            y={y(value)}
                                            width={barW}
                                            height={Math.max(1, PAD.top + innerH - y(value))}
                                            fill="#e85d4c"
                                            opacity={hover == null || hover === i ? 1 : 0.55}
                                        />
                                    ) : null}
                                    {/* Hit target: the whole column, bigger than the bar. */}
                                    <rect
                                        x={PAD.left + i * slot}
                                        y={PAD.top}
                                        width={slot}
                                        height={innerH}
                                        fill="transparent"
                                        tabIndex={0}
                                        aria-label={`${shortDate(row.date)}: ${format(value)}`}
                                        onPointerEnter={() => setHover(i)}
                                        onPointerLeave={() => setHover(null)}
                                        onFocus={() => setHover(i)}
                                        onBlur={() => setHover(null)}
                                        className="cursor-default outline-none focus:stroke-coral"
                                    />
                                    {i % labelEvery === 0 ? (
                                        <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" className="fill-ink/45 text-[10px] dark:fill-white/45">
                                            {shortDate(row.date)}
                                        </text>
                                    ) : null}
                                </g>
                            );
                        })}
                        <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="stroke-ink/25 dark:stroke-white/25" strokeWidth="1" />
                    </svg>
                    {active ? (
                        <div
                            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap border border-ink/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-[#222]"
                            style={{ left: Math.min(Math.max(PAD.left + hover * slot + slot / 2, 60), width - 60) }}
                        >
                            <p className="text-sm font-extrabold tabular-nums">{format(active[valueKey] || 0)}</p>
                            <p className="text-ink/55 dark:text-white/55">{shortDate(active.date)}</p>
                        </div>
                    ) : null}
                </div>
            )}
        </section>
    );
}
