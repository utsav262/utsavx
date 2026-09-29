import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Search, X } from 'lucide-react';
import { admin as api, downloadCsv } from '../api.js';
import { useToast } from '../../components/ui/Toast.jsx';

export const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (v) => (v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
/** Team invite status codes → words. */
export const inviteStatus = (code) => ({ A: 'accepted', P: 'pending', D: 'declined' }[code] || code);
export const errorText = (failure, fallback) => failure?.response?.data?.message || fallback;
const overlayRoot = () => document.getElementById('admin-overlays') || document.body;

/** Page title block. */
export function PageHead({ eyebrow, title, children }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">{eyebrow}</p>
                <h1 className="serif mt-1 text-5xl">{title}</h1>
            </div>
            {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
        </div>
    );
}

export function Button({ tone = 'ghost', className = '', ...props }) {
    const tones = {
        ghost: 'border border-ink/15 hover:border-coral dark:border-white/15',
        primary: 'bg-coral text-white hover:opacity-90',
        dark: 'bg-ink text-white dark:bg-white dark:text-ink',
        danger: 'bg-red-600 text-white hover:opacity-90'
    };
    return <button type="button" {...props} className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-extrabold uppercase tracking-wider disabled:opacity-50 ${tones[tone]} ${className}`} />;
}

export const inputCls = 'w-full border border-ink/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-coral dark:border-white/20 dark:bg-[#111] dark:text-white';

export function Field({ label, error, children, hint }) {
    return (
        <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55 dark:text-white/55">{label}</span>
            <span className="mt-1.5 block">{children}</span>
            {hint ? <span className="mt-1 block text-xs text-ink/45 dark:text-white/45">{hint}</span> : null}
            {error ? <span className="mt-1 block text-xs text-red-600" role="alert">{Array.isArray(error) ? error[0] : error}</span> : null}
        </label>
    );
}

export function Badge({ tone = 'ink', children }) {
    const tones = {
        ink: 'bg-ink/10 text-ink dark:bg-white/10 dark:text-white',
        green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        blue: 'bg-sky/15 text-sky',
        coral: 'bg-coral/15 text-coral'
    };
    return <span className={`inline-block whitespace-nowrap px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

/**
 * Loads a paged list endpoint. Returns { rows, pagination, extra, loading, params, setParam, reload }.
 * setParam resets to page 1 unless it's the page itself.
 */
export function useAdminList(path, initial = {}) {
    const toast = useToast();
    const [params, setParams] = useState({ page: 1, ...initial });
    const [state, setState] = useState({ rows: [], pagination: null, extra: {}, loading: true });
    const load = useCallback(async () => {
        setState((s) => ({ ...s, loading: true }));
        try {
            const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
            const res = await api.get(path, clean);
            const { result, pagination, message, code, ...extra } = res.data;
            setState({ rows: result || [], pagination, extra, loading: false });
        } catch (failure) {
            toast.error(errorText(failure, 'Could not load the list.'));
            setState((s) => ({ ...s, loading: false }));
        }
    }, [path, params]);
    useEffect(() => { load(); }, [load]);
    const setParam = (key, value) => setParams((p) => ({ ...p, [key]: value, ...(key === 'page' ? {} : { page: 1 }) }));
    return { ...state, params, setParam, reload: load };
}

/** Search + filters + CSV export, in one row above the table. */
export function Toolbar({ search, onSearch, placeholder = 'Search…', filters = [], csv }) {
    const toast = useToast();
    const [text, setText] = useState(search || '');
    const [exporting, setExporting] = useState(false);
    const timer = useRef(null);
    const change = (value) => {
        setText(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onSearch(value.trim()), 300);
    };
    const exportCsv = async () => {
        setExporting(true);
        try {
            await downloadCsv(csv.path, csv.params, csv.filename);
        } catch (failure) {
            toast.error(errorText(failure, 'Export failed.'));
        } finally {
            setExporting(false);
        }
    };
    return (
        <div className="flex flex-wrap items-center gap-2">
            {onSearch ? (
                <div className="relative min-w-[220px] flex-1">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 dark:text-white/40" />
                    <input value={text} onChange={(e) => change(e.target.value)} placeholder={placeholder} aria-label="Search" className={`${inputCls} pl-9`} />
                </div>
            ) : null}
            {filters.map((f) => (
                <select key={f.label} aria-label={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)} className={`${inputCls} w-auto`}>
                    {f.options.map(([value, label]) => <option key={value} value={value}>{f.label}: {label}</option>)}
                </select>
            ))}
            {csv ? <Button onClick={exportCsv} disabled={exporting}><Download size={13} /> {exporting ? 'Exporting…' : 'CSV'}</Button> : null}
        </div>
    );
}

/** Responsive table: horizontal scroll on narrow screens, keyboard-activatable rows. */
export function DataTable({ columns, rows, loading, onRowClick, empty = 'Nothing here.', minWidth = 760 }) {
    return (
        <div className="overflow-x-auto border border-ink/10 bg-white dark:border-white/10 dark:bg-[#1b1b1b]">
            <table className="w-full text-left text-sm" style={{ minWidth }}>
                <thead>
                    <tr className="border-b border-ink/10 text-[10px] uppercase tracking-wider text-ink/45 dark:border-white/10 dark:text-white/45">
                        {columns.map((c) => <th key={c.key} className={`px-4 py-3 font-extrabold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {loading && !rows.length ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink/45 dark:text-white/45">Loading…</td></tr> : null}
                    {!loading && !rows.length ? <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink/45 dark:text-white/45">{empty}</td></tr> : null}
                    {rows.map((row) => (
                        <tr
                            key={row._id}
                            tabIndex={onRowClick ? 0 : undefined}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                            className={`border-t border-ink/10 dark:border-white/10 ${onRowClick ? 'cursor-pointer hover:bg-ink/5 focus:bg-ink/5 focus:outline-none dark:hover:bg-white/5 dark:focus:bg-white/5' : ''} ${loading ? 'opacity-60' : ''}`}
                        >
                            {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-top ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.render ? c.render(row) : row[c.key]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Pagination({ pagination, onPage }) {
    if (!pagination) return null;
    return (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink/60 dark:text-white/60">
            <span>{pagination.total} result{pagination.total === 1 ? '' : 's'}</span>
            {pagination.pages > 1 ? (
                <span className="flex items-center gap-2">
                    <Button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</Button>
                    <span>Page {pagination.page} of {pagination.pages}</span>
                    <Button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>Next</Button>
                </span>
            ) : null}
        </div>
    );
}

/** Right-side panel for details and forms. */
export function Drawer({ open, title, eyebrow, onClose, children, footer }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/50" onClick={onClose}>
            <aside role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col bg-cream text-ink dark:bg-[#141414] dark:text-white">
                <div className="flex items-start justify-between gap-3 border-b border-ink/10 p-6 dark:border-white/10">
                    <div className="min-w-0">
                        {eyebrow ? <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">{eyebrow}</p> : null}
                        <h2 className="serif mt-1 truncate text-3xl">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-ink/50 hover:text-ink dark:text-white/50 dark:hover:text-white"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
                {footer ? <div className="flex flex-wrap gap-2 border-t border-ink/10 p-4 dark:border-white/10">{footer}</div> : null}
            </aside>
        </div>,
        overlayRoot()
    );
}

export function Facts({ items }) {
    return (
        <dl className="grid grid-cols-2 gap-3 text-sm">
            {items.filter(Boolean).map(([k, v]) => (
                <div key={k} className="border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-[#1b1b1b]">
                    <dt className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45 dark:text-white/45">{k}</dt>
                    <dd className="mt-1 break-words font-bold">{v}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Section({ title, children }) {
    return (
        <section className="mt-6">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55 dark:text-white/55">{title}</h3>
            <div className="mt-2">{children}</div>
        </section>
    );
}

/** Load one detail record by id. */
export function useDetail(path) {
    const toast = useToast();
    const [row, setRow] = useState(null);
    const load = useCallback(async () => {
        if (!path) return;
        setRow(null);
        try {
            setRow((await api.get(path)).data.result);
        } catch (failure) {
            toast.error(errorText(failure, 'Could not load details.'));
        }
    }, [path]);
    useEffect(() => { load(); }, [load]);
    return [row, load, setRow];
}
