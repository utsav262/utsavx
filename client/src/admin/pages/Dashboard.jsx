import { useCallback, useEffect, useState } from 'react';
import {
    AlertTriangle, CalendarCheck, CreditCard, Landmark, RefreshCw, ShieldAlert, Ticket, TrendingUp, UserPlus
} from 'lucide-react';
import { admin as api } from '../api.js';
import { money } from '../../lib/money.js';
import DailyBarChart from '../components/DailyBarChart.jsx';

const PRESETS = [
    { id: '7', label: '7 days', days: 7 },
    { id: '30', label: '30 days', days: 30 },
    { id: '90', label: '90 days', days: 90 },
    { id: 'custom', label: 'Custom' }
];

const isoDay = (date) => date.toISOString().slice(0, 10);
function presetRange(days) {
    const to = new Date();
    const from = new Date(Date.now() - (days - 1) * 86400000);
    return { from: isoDay(from), to: isoDay(to) };
}
const number = (v) => new Intl.NumberFormat('en-IN').format(Number(v || 0));

function Tile({ label, value, hint, Icon, tone = 'ink' }) {
    const tones = {
        ink: 'bg-ink/5 text-ink dark:bg-white/10 dark:text-white',
        coral: 'bg-coral/10 text-coral',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    };
    return (
        <div className="border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1b1b1b]">
            <span className={`flex h-9 w-9 items-center justify-center ${tones[tone]}`}>
                <Icon size={16} />
            </span>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/55">{label}</p>
            <p className="serif mt-1 text-3xl leading-none tabular-nums">{value}</p>
            {hint ? <p className="mt-2 text-xs text-ink/50 dark:text-white/50">{hint}</p> : null}
        </div>
    );
}

export default function AdminDashboard() {
    const [preset, setPreset] = useState('30');
    const [range, setRange] = useState(() => presetRange(30));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async (refresh = false) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.dashboard({ ...range, refresh: refresh ? '1' : undefined });
            setData(res.data.result);
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not load the dashboard.');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        load();
    }, [load]);

    const choosePreset = (item) => {
        setPreset(item.id);
        if (item.days) setRange(presetRange(item.days));
    };

    const t = data?.totals;
    const series = data?.series || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Overview</p>
                    <h1 className="serif mt-1 text-5xl">Dashboard</h1>
                </div>
                {/* Filters: one row above the charts */}
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => choosePreset(item)}
                            aria-pressed={preset === item.id}
                            className={`px-3 py-2 text-xs font-extrabold uppercase tracking-wider ${
                                preset === item.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-ink/15 dark:border-white/15'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                    {preset === 'custom' ? (
                        <>
                            <input
                                type="date"
                                aria-label="From"
                                value={range.from}
                                max={range.to}
                                onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
                                className="border border-ink/15 bg-white px-2 py-1.5 text-xs dark:border-white/15 dark:bg-[#1b1b1b]"
                            />
                            <input
                                type="date"
                                aria-label="To"
                                value={range.to}
                                min={range.from}
                                onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
                                className="border border-ink/15 bg-white px-2 py-1.5 text-xs dark:border-white/15 dark:bg-[#1b1b1b]"
                            />
                        </>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => load(true)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 border border-ink/15 px-3 py-2 text-xs font-extrabold uppercase tracking-wider hover:border-coral disabled:opacity-60 dark:border-white/15"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                    {error}
                </p>
            ) : null}

            {!data && loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-36 animate-pulse bg-ink/5 dark:bg-white/5" />
                    ))}
                </div>
            ) : null}

            {t ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Tile label="Gross sales" value={money(t.gross_sales)} hint={`${number(t.paid_orders)} paid orders`} Icon={TrendingUp} tone="coral" />
                        <Tile label="Platform fees" value={money(t.platform_fees)} hint={`${data.platform_fee_percent}% service fee`} Icon={Landmark} />
                        <Tile label="Tickets sold" value={number(t.tickets_sold)} Icon={Ticket} />
                        <Tile label="Active events" value={number(t.active_events)} hint={`${number(t.pending_events)} awaiting review`} Icon={CalendarCheck} />
                        <Tile label="New users" value={number(t.new_users)} Icon={UserPlus} />
                        <Tile label="Net to organizers" value={money(t.net_to_organizers)} Icon={CreditCard} />
                        <Tile
                            label="Failed payments"
                            value={number(t.failed_payments)}
                            hint="Cancelled or expired checkouts"
                            Icon={AlertTriangle}
                            tone={t.failed_payments ? 'amber' : 'ink'}
                        />
                        <Tile
                            label="Fraud alerts"
                            value={t.fraud_alerts == null ? '—' : number(t.fraud_alerts)}
                            hint={t.fraud_alerts == null ? 'Fraud detection not set up yet' : undefined}
                            Icon={ShieldAlert}
                            tone={t.fraud_alerts ? 'red' : 'ink'}
                        />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <div className="xl:col-span-2">
                            <DailyBarChart title="Gross sales per day" rows={series} valueKey="gross_sales" format={money} total={money(t.gross_sales)} />
                        </div>
                        <DailyBarChart title="Tickets sold per day" rows={series} valueKey="tickets_sold" format={number} total={number(t.tickets_sold)} />
                        <DailyBarChart title="New users per day" rows={series} valueKey="new_users" format={number} total={number(t.new_users)} />
                    </div>

                    <p className="text-xs text-ink/45 dark:text-white/45">
                        Days are in UTC. {data.cached ? 'Served from cache' : 'Freshly computed'} at{' '}
                        {new Date(data.generated_at).toLocaleTimeString()} · cached for 2 minutes.
                    </p>
                </>
            ) : null}
        </div>
    );
}
