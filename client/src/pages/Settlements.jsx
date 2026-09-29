import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Landmark, Paperclip, Upload, X } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { money } from '../lib/money.js';
import { useToast } from '../components/ui/Toast.jsx';

const STATUS = {
    pending: { label: 'Due', cls: 'bg-amber-100 text-amber-700' },
    submitted: { label: 'In review', cls: 'bg-sky/15 text-sky' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700' }
};

const day = (value) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const range = (p) => {
    if (!p?.start && !p?.end) return '—';
    const [a, b] = [day(p.start), day(p.end)];
    return a === b ? a : `${a} – ${b}`;
};

function Stat({ label, value }) {
    return (
        <div className="border border-ink/10 bg-white p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/45">{label}</p>
            <p className="mt-1 font-extrabold">{value}</p>
        </div>
    );
}

export default function Settlements() {
    const toast = useToast();
    const inputRef = useRef(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setData(unwrap(await apiClient.settlements(), null));
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not load settlements.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const limits = data?.limits || { max_files: 5, max_bytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] };
    const previews = useMemo(
        () => files.map((file) => ({ file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null })),
        [files]
    );
    useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews]);

    const pick = (event) => {
        const chosen = Array.from(event.target.files || []);
        event.target.value = '';
        const next = [...files, ...chosen];
        if (next.length > limits.max_files) return toast.error(`You can upload up to ${limits.max_files} receipts.`);
        if (chosen.some((f) => !limits.types.includes(f.type))) return toast.error('Receipts must be JPG, PNG, WebP or PDF.');
        if (chosen.some((f) => f.size > limits.max_bytes)) return toast.error('Each receipt must be 5MB or smaller.');
        setFiles(next);
    };

    const submit = async () => {
        const ids = (data?.collections || []).map((c) => c._id);
        if (!ids.length) return toast.error('No pending remittance right now.');
        if (!files.length) return toast.error('Upload at least one transfer receipt first.');
        const form = new FormData();
        ids.forEach((id) => form.append('collection_ids', id));
        files.forEach((file) => form.append('receipts', file));
        setSubmitting(true);
        try {
            await apiClient.submitSettlementReceipts(form);
            toast.success('Receipts submitted for review.');
            setFiles([]);
            await load();
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not submit receipts. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const openReceipt = async (settlementId, receipt) => {
        const win = window.open('', '_blank');
        try {
            const res = await apiClient.settlementReceipt(settlementId, receipt._id);
            const url = URL.createObjectURL(res.data);
            if (win) win.location.href = url;
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            win?.close();
            toast.error('Could not open that receipt.');
        }
    };

    const due = data?.collections || [];
    const history = data?.history || [];

    return (
        <main className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink">
                <ArrowLeft size={14} /> Dashboard
            </Link>
            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Payouts</p>
            <h1 className="serif mt-1 text-5xl">Settlements</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink/60">
                Cash and gate sales are collected by you, so the platform service fee on them is paid back here.
                Transfer the amount below, then upload the bank receipt for review.
            </p>

            {loading && !data ? (
                <div className="mt-8 space-y-3">
                    <div className="h-40 animate-pulse bg-ink/5" />
                    <div className="h-24 animate-pulse bg-ink/5" />
                </div>
            ) : null}

            {data ? (
                <>
                    <section className="mt-8 bg-ink p-6 text-white sm:p-8">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">Amount to remit</p>
                        <p className="serif mt-2 text-5xl">{money(data.total_to_remit)}</p>
                        <p className="mt-2 text-sm text-white/60">
                            {data.number_of_events
                                ? `${due[0]?.fee_percent ?? 5}% of ${money(data.total_cash_collected)} collected in cash`
                                : 'Nothing is due right now.'}
                        </p>
                    </section>

                    {due.length ? (
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Stat label="Sales period" value={range(data.sales_period)} />
                            <Stat label="Events" value={data.number_of_events} />
                            <Stat label="Tickets sold" value={data.total_tickets_sold} />
                            <Stat label="Deposit by" value={day(data.deposit_due_date)} />
                        </div>
                    ) : null}

                    {due.length ? (
                        <section className="mt-8">
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">Due now</h2>
                            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                                {due.map((row) => (
                                    <li key={row._id} className="py-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-bold">{row.event?.title || 'Event'}</p>
                                                <p className="mt-0.5 text-xs text-ink/50">
                                                    {row.orders_count} cash order{row.orders_count === 1 ? '' : 's'} · {money(row.cash_collected)} collected · due {day(row.due_date)}
                                                </p>
                                            </div>
                                            <p className="shrink-0 font-extrabold">{money(row.amount_due)}</p>
                                        </div>
                                        {row.review_note ? (
                                            <p className="mt-2 border-l-2 border-coral bg-coral/5 px-3 py-2 text-xs text-ink/70">
                                                <strong>Sent back:</strong> {row.review_note}
                                            </p>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : (
                        <p className="mt-8 border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink/55">
                            No remittance is due. Cash and gate sales will show up here automatically.
                        </p>
                    )}

                    {due.length ? (
                        <section className="mt-8 grid gap-4 lg:grid-cols-2">
                            <div className="border border-ink/10 bg-white p-5">
                                <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">
                                    <Landmark size={14} className="text-coral" /> Transfer to
                                </h2>
                                {data.bank ? (
                                    <dl className="mt-3 space-y-2 text-sm">
                                        {[
                                            ['Account name', data.bank.account_name],
                                            ['Bank', data.bank.bank_name],
                                            ['Account no.', data.bank.account_number],
                                            ['IFSC', data.bank.ifsc],
                                            ['UPI', data.bank.upi_id]
                                        ].filter(([, v]) => v).map(([k, v]) => (
                                            <div key={k} className="flex justify-between gap-3">
                                                <dt className="text-ink/50">{k}</dt>
                                                <dd className="select-all font-bold">{v}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <p className="mt-3 text-sm text-ink/55">Bank details haven't been configured yet. Contact support before transferring.</p>
                                )}
                            </div>

                            <div className="border border-ink/10 bg-white p-5">
                                <h2 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">
                                    <Paperclip size={14} className="text-coral" /> Transfer receipts
                                </h2>
                                <input ref={inputRef} type="file" multiple accept={limits.types.join(',')} onChange={pick} className="hidden" />
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    disabled={files.length >= limits.max_files}
                                    className="mt-3 flex w-full flex-col items-center gap-1 border-2 border-dashed border-ink/20 px-4 py-6 text-sm text-ink/60 hover:border-coral disabled:opacity-50"
                                >
                                    <Upload size={18} className="text-coral" />
                                    {files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected — add more` : 'Choose receipt images or PDFs'}
                                    <span className="text-xs text-ink/40">Up to {limits.max_files} files, 5MB each</span>
                                </button>
                                {previews.length ? (
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {previews.map(({ file, url }, index) => (
                                            <li key={`${file.name}-${index}`} className="relative h-16 w-16 border border-ink/10 bg-cream">
                                                {url ? (
                                                    <img src={url} alt={file.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="flex h-full w-full items-center justify-center"><FileText size={20} className="text-ink/40" /></span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                                                    aria-label={`Remove ${file.name}`}
                                                    className="absolute -right-2 -top-2 bg-ink p-0.5 text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={submitting || !files.length}
                                    className="mt-4 w-full bg-coral px-4 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : 'Submit receipts for review'}
                                </button>
                            </div>
                        </section>
                    ) : null}

                    {history.length ? (
                        <section className="mt-10">
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">History</h2>
                            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                                {history.map((row) => {
                                    const s = STATUS[row.status] || STATUS.pending;
                                    return (
                                        <li key={row._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-bold">{row.event?.title || 'Event'}</p>
                                                <p className="mt-0.5 text-xs text-ink/50">
                                                    Submitted {day(row.submitted_at)}
                                                    {row.reviewed_at ? ` · reviewed ${day(row.reviewed_at)}` : ''}
                                                </p>
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {row.receipts.map((r) => (
                                                        <button key={r._id} type="button" onClick={() => openReceipt(row._id, r)} className="text-xs font-bold text-coral hover:underline">
                                                            {r.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold">{money(row.amount_due)}</span>
                                                <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${s.cls}`}>{s.label}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ) : null}
                </>
            ) : null}
        </main>
    );
}
