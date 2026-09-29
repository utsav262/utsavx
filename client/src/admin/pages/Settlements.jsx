import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ExternalLink, FileText, RotateCcw, X } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const TABS = [
    { id: 'submitted', label: 'Needs review' },
    { id: 'pending', label: 'Due from hosts' },
    { id: 'approved', label: 'Approved' },
    { id: 'all', label: 'All' }
];
const STATUS = {
    pending: { label: 'Due', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
    submitted: { label: 'In review', cls: 'bg-sky/15 text-sky' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' }
};
const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const period = (p) => {
    const [a, b] = [day(p?.start), day(p?.end)];
    return a === b ? a : `${a} – ${b}`;
};
const overlayRoot = () => document.getElementById('admin-overlays') || document.body;

function Receipt({ settlementId, receipt }) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        let revoked = null;
        let alive = true;
        api.settlementReceipt(settlementId, receipt._id)
            .then((res) => {
                if (!alive) return;
                revoked = URL.createObjectURL(res.data);
                setUrl(revoked);
            })
            .catch(() => {});
        return () => {
            alive = false;
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [settlementId, receipt._id]);
    const isImage = receipt.type?.startsWith('image/');
    return (
        <a
            href={url || undefined}
            target="_blank"
            rel="noreferrer"
            className="group block border border-ink/10 bg-cream dark:border-white/10 dark:bg-white/5"
            aria-label={`Open ${receipt.name}`}
        >
            <span className="flex h-40 items-center justify-center overflow-hidden">
                {isImage && url ? (
                    <img src={url} alt={receipt.name} className="h-full w-full object-contain" />
                ) : (
                    <FileText size={28} className="text-ink/40 dark:text-white/40" />
                )}
            </span>
            <span className="flex items-center justify-between gap-2 border-t border-ink/10 px-2 py-1.5 text-xs dark:border-white/10">
                <span className="truncate">{receipt.name}</span>
                <ExternalLink size={12} className="shrink-0 opacity-50 group-hover:opacity-100" />
            </span>
        </a>
    );
}

function Detail({ id, canReview, onClose, onReviewed }) {
    const toast = useToast();
    const [row, setRow] = useState(null);
    const [confirm, setConfirm] = useState(null); // 'approve' | 'reject'
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setRow(null);
        api.settlement(id)
            .then((res) => setRow(res.data.result))
            .catch((failure) => toast.error(failure.response?.data?.message || 'Could not load settlement.'));
    }, [id]);

    const act = async () => {
        if (confirm === 'reject' && !note.trim()) return toast.error('Add a note so the host knows what to fix.');
        setBusy(true);
        try {
            const res = confirm === 'approve' ? await api.approveSettlement(id, note.trim() || undefined) : await api.rejectSettlement(id, note.trim());
            toast.success(res.data.message);
            setConfirm(null);
            setNote('');
            onReviewed();
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not update the settlement.');
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/50" onClick={onClose}>
            <aside
                className="h-full w-full max-w-xl overflow-y-auto bg-cream p-6 text-ink dark:bg-[#141414] dark:text-white"
                onClick={(e) => e.stopPropagation()}
                aria-label="Settlement detail"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Settlement</p>
                        <h2 className="serif mt-1 text-3xl">{row?.event?.title || '…'}</h2>
                        {row ? <p className="mt-1 text-sm text-ink/55 dark:text-white/55">{row.organizer?.name} · {row.organizer?.email}</p> : null}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-ink/50 hover:text-ink dark:text-white/50">
                        <X size={18} />
                    </button>
                </div>

                {!row ? <div className="mt-6 h-64 animate-pulse bg-ink/5 dark:bg-white/5" /> : (
                    <>
                        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                            {[
                                ['Amount due', money(row.amount_due)],
                                ['Cash collected', money(row.cash_collected)],
                                ['Fee', `${row.fee_percent}%`],
                                ['Tickets', row.tickets_sold],
                                ['Sales period', period(row.sales_period)],
                                ['Due by', day(row.due_date)],
                                ['Submitted', day(row.submitted_at)],
                                ['Times sent back', row.rejected_count]
                            ].map(([k, v]) => (
                                <div key={k} className="border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-[#1b1b1b]">
                                    <dt className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45 dark:text-white/45">{k}</dt>
                                    <dd className="mt-1 font-bold">{v}</dd>
                                </div>
                            ))}
                        </dl>

                        {row.review_note ? (
                            <p className="mt-4 border-l-2 border-coral bg-coral/5 px-3 py-2 text-sm">
                                <strong>Review note:</strong> {row.review_note}
                            </p>
                        ) : null}

                        <h3 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55 dark:text-white/55">
                            Receipts ({row.receipts.length})
                        </h3>
                        {row.receipts.length ? (
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                {row.receipts.map((r) => <Receipt key={r._id} settlementId={row._id} receipt={r} />)}
                            </div>
                        ) : (
                            <p className="mt-2 text-sm text-ink/50 dark:text-white/50">No receipts uploaded yet.</p>
                        )}

                        <h3 className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55 dark:text-white/55">
                            Cash orders ({row.orders.length})
                        </h3>
                        <table className="mt-2 w-full text-left text-sm">
                            <tbody>
                                {row.orders.map((o) => (
                                    <tr key={o._id} className="border-t border-ink/10 dark:border-white/10">
                                        <td className="py-2 font-mono text-xs">{o.order_number}</td>
                                        <td className="py-2 text-xs text-ink/55 dark:text-white/55">{o.source} · {day(o.created_at)}</td>
                                        <td className="py-2 text-right tabular-nums">{o.tickets} tix</td>
                                        <td className="py-2 text-right font-bold tabular-nums">{money(o.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {canReview && row.status === 'submitted' ? (
                            <div className="sticky bottom-0 -mx-6 mt-6 flex gap-2 border-t border-ink/10 bg-cream px-6 py-4 dark:border-white/10 dark:bg-[#141414]">
                                <button type="button" onClick={() => setConfirm('reject')} className="inline-flex flex-1 items-center justify-center gap-2 border border-ink/20 px-4 py-3 text-xs font-extrabold uppercase tracking-wider dark:border-white/20">
                                    <RotateCcw size={14} /> Send back
                                </button>
                                <button type="button" onClick={() => setConfirm('approve')} className="inline-flex flex-1 items-center justify-center gap-2 bg-coral px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white">
                                    <Check size={14} /> Approve
                                </button>
                            </div>
                        ) : null}
                    </>
                )}

                <ConfirmModal
                    open={Boolean(confirm)}
                    title={confirm === 'approve' ? `Approve ${money(row?.amount_due || 0)}?` : 'Send back to the host?'}
                    body={confirm === 'approve'
                        ? 'Confirm the receipts show this amount reaching the platform account. The host will be notified.'
                        : 'The settlement goes back to "Due" and the host sees your note.'}
                    confirmLabel={confirm === 'approve' ? 'Approve' : 'Send back'}
                    tone={confirm === 'reject' ? 'danger' : 'coral'}
                    busy={busy}
                    onConfirm={act}
                    onCancel={() => { setConfirm(null); setNote(''); }}
                >
                    <label className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-ink/55 dark:text-white/55" htmlFor="review-note">
                        {confirm === 'reject' ? 'What needs fixing (required)' : 'Note (optional)'}
                    </label>
                    <textarea
                        id="review-note"
                        rows={3}
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="mt-2 w-full border border-ink/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-coral dark:border-white/20 dark:bg-[#111] dark:text-white"
                    />
                </ConfirmModal>
            </aside>
        </div>,
        overlayRoot()
    );
}

export default function AdminSettlements() {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const canReview = admin?.role === 'super_admin' || admin?.role === 'admin';
    const [tab, setTab] = useState('submitted');
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ rows: [], pagination: null, counts: {} });
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.settlements({ status: tab, page });
            setData({ rows: res.data.result, pagination: res.data.pagination, counts: res.data.counts || {} });
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not load settlements.');
        } finally {
            setLoading(false);
        }
    }, [tab, page]);

    useEffect(() => {
        load();
    }, [load]);

    const countFor = (id) =>
        id === 'all' ? Object.values(data.counts).reduce((s, c) => s + c.count, 0) : data.counts[id]?.count || 0;

    return (
        <div className="space-y-6">
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Payouts</p>
                <h1 className="serif mt-1 text-5xl">Settlements</h1>
                <p className="mt-2 max-w-2xl text-sm text-ink/60 dark:text-white/60">
                    Hosts remit the platform fee on cash and gate sales and upload a transfer receipt. Check the receipt against the amount, then approve or send it back.
                </p>
            </div>

            <div className="flex flex-wrap gap-2" role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => { setTab(t.id); setPage(1); }}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wider ${
                            tab === t.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-ink/15 dark:border-white/15'
                        }`}
                    >
                        {t.label}
                        <span className={`px-1.5 text-[10px] ${tab === t.id ? 'bg-white/20 dark:bg-ink/20' : 'bg-coral/15 text-coral'}`}>{countFor(t.id)}</span>
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto border border-ink/10 bg-white dark:border-white/10 dark:bg-[#1b1b1b]">
                <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                        <tr className="border-b border-ink/10 text-[10px] uppercase tracking-wider text-ink/45 dark:border-white/10 dark:text-white/45">
                            <th className="px-4 py-3 font-extrabold">Event / host</th>
                            <th className="px-4 py-3 font-extrabold">Cash collected</th>
                            <th className="px-4 py-3 font-extrabold">Amount due</th>
                            <th className="px-4 py-3 font-extrabold">Due by</th>
                            <th className="px-4 py-3 font-extrabold">Receipts</th>
                            <th className="px-4 py-3 font-extrabold">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && !data.rows.length ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/45 dark:text-white/45">Loading…</td></tr>
                        ) : null}
                        {!loading && !data.rows.length ? (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/45 dark:text-white/45">Nothing here.</td></tr>
                        ) : null}
                        {data.rows.map((row) => {
                            const s = STATUS[row.status];
                            return (
                                <tr
                                    key={row._id}
                                    tabIndex={0}
                                    onClick={() => setOpenId(row._id)}
                                    onKeyDown={(e) => e.key === 'Enter' && setOpenId(row._id)}
                                    className="cursor-pointer border-t border-ink/10 hover:bg-ink/5 focus:bg-ink/5 focus:outline-none dark:border-white/10 dark:hover:bg-white/5"
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-bold">{row.event?.title || 'Event'}</p>
                                        <p className="text-xs text-ink/50 dark:text-white/50">{row.organizer?.email}</p>
                                    </td>
                                    <td className="px-4 py-3 tabular-nums">{money(row.cash_collected)}</td>
                                    <td className="px-4 py-3 font-extrabold tabular-nums">{money(row.amount_due)}</td>
                                    <td className="px-4 py-3">{day(row.due_date)}</td>
                                    <td className="px-4 py-3">{row.receipts.length}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${s?.cls}`}>{s?.label || row.status}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {data.pagination && data.pagination.pages > 1 ? (
                <div className="flex items-center justify-end gap-2 text-sm">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border border-ink/15 px-3 py-1.5 disabled:opacity-40 dark:border-white/15">Previous</button>
                    <span>Page {data.pagination.page} of {data.pagination.pages}</span>
                    <button type="button" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)} className="border border-ink/15 px-3 py-1.5 disabled:opacity-40 dark:border-white/15">Next</button>
                </div>
            ) : null}

            {openId ? (
                <Detail
                    id={openId}
                    canReview={canReview}
                    onClose={() => setOpenId(null)}
                    onReviewed={() => { setOpenId(null); load(); }}
                />
            ) : null}
        </div>
    );
}
