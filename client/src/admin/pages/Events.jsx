import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus, Star } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
    Badge, Button, DataTable, Drawer, Facts, Field, PageHead, Pagination, Section, Toolbar,
    dateTime, errorText, inputCls, inviteStatus, useAdminList, useDetail
} from '../components/kit.jsx';

const STATUS_TONE = { review_pending: 'amber', published: 'green', 'sold-out': 'blue', draft: 'ink', cancelled: 'red' };
const STATUS_LABEL = { review_pending: 'Pending review', published: 'Published', 'sold-out': 'Sold out', draft: 'Draft', cancelled: 'Cancelled' };

/** Which moderation buttons a status offers. */
const ACTIONS_FOR = {
    review_pending: ['approve', 'reject', 'cancel'],
    published: ['unpublish', 'cancel'],
    'sold-out': ['unpublish', 'cancel'],
    draft: ['republish', 'cancel'],
    cancelled: ['republish']
};
const ACTION_COPY = {
    approve: { label: 'Approve', tone: 'primary', title: 'Approve and publish?', body: 'The event goes live and tickets go on sale. The organizer is notified.' },
    reject: { label: 'Send back', tone: 'ghost', note: true, title: 'Send back to the organizer?', body: 'It returns to draft with your note.' },
    unpublish: { label: 'Unpublish', tone: 'ghost', note: true, title: 'Unpublish this event?', body: 'It disappears from the site and sales stop. Existing tickets stay valid.' },
    cancel: { label: 'Cancel event', tone: 'danger', note: true, title: 'Cancel this event?', body: 'Sales stop and the organizer is notified. Refund ticket holders from Orders.' },
    republish: { label: 'Publish', tone: 'primary', title: 'Publish this event?', body: 'It goes live on the site.' }
};

function EventDrawer({ id, onClose, onChanged }) {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const [event, reload] = useDetail(id ? `/events/${id}` : null);
    const [action, setAction] = useState(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const canAct = admin.role !== 'support';

    const run = async () => {
        setBusy(true);
        try {
            const res = action === 'feature' || action === 'unfeature'
                ? await api.post(`/events/${id}/feature`, { featured: action === 'feature' })
                : await api.post(`/events/${id}/moderate`, { action, note: note.trim() || undefined });
            toast.success(res.data.message);
            setAction(null);
            setNote('');
            await reload();
            onChanged();
        } catch (failure) {
            toast.error(errorText(failure, 'Could not update the event.'));
        } finally {
            setBusy(false);
        }
    };

    const copy = action === 'feature' ? { title: 'Feature this event?', body: 'It gets priority placement on the homepage.', label: 'Feature' }
        : action === 'unfeature' ? { title: 'Remove from featured?', body: 'It keeps selling normally.', label: 'Unfeature' }
            : ACTION_COPY[action] || {};

    return (
        <Drawer
            open={Boolean(id)}
            onClose={onClose}
            eyebrow="Event"
            title={event?.title || '…'}
            footer={event && canAct ? (
                <>
                    {(ACTIONS_FOR[event.status] || []).map((a) => (
                        <Button key={a} tone={ACTION_COPY[a].tone} onClick={() => setAction(a)}>{ACTION_COPY[a].label}</Button>
                    ))}
                    <Button className="ml-auto" onClick={() => setAction(event.featured ? 'unfeature' : 'feature')}>
                        <Star size={13} className={event.featured ? 'fill-butter text-amber-600' : ''} /> {event.featured ? 'Unfeature' : 'Feature'}
                    </Button>
                </>
            ) : null}
        >
            {!event ? <div className="h-64 animate-pulse bg-ink/5 dark:bg-white/5" /> : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[event.status]}>{STATUS_LABEL[event.status]}</Badge>
                        {event.featured ? <Badge tone="coral">Featured</Badge> : null}
                        <a href={`/events/${event.slug || event._id}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-coral hover:underline">
                            Public page <ExternalLink size={12} />
                        </a>
                    </div>
                    {event.review_note ? <p className="mt-4 border-l-2 border-coral bg-coral/5 px-3 py-2 text-sm"><strong>Last note:</strong> {event.review_note}</p> : null}
                    <div className="mt-5">
                        <Facts items={[
                            ['Organizer', event.organizer?.email || '—'],
                            ['Starts', dateTime(event.starts_at)],
                            ['Venue', [event.venue?.name, event.venue?.city].filter(Boolean).join(', ') || '—'],
                            ['Category', event.category],
                            ['Sold / capacity', `${event.sold} / ${event.capacity || '∞'}`],
                            ['Gross sales', `${money(event.sales.gross)} · ${event.sales.orders} orders`],
                            ['Page views', event.page_views]
                        ]} />
                    </div>
                    {event.description ? <Section title="Description"><p className="whitespace-pre-line text-sm text-ink/70 dark:text-white/70">{event.description}</p></Section> : null}
                    <Section title={`Ticket types (${event.tickets.length})`}>
                        <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                            {event.tickets.map((t) => <li key={t._id} className="flex justify-between gap-3 py-2"><span>{t.name}</span><span className="tabular-nums text-ink/60 dark:text-white/60">{money(t.price)} · {t.sold}/{t.quantity || '∞'}</span></li>)}
                        </ul>
                    </Section>
                    {event.images.length ? (
                        <Section title="Images">
                            <div className="grid grid-cols-3 gap-2">
                                {event.images.map((i) => <img key={i._id} src={i.url} alt={i.type} className="aspect-video w-full object-cover" />)}
                            </div>
                        </Section>
                    ) : null}
                    {event.team.length ? (
                        <Section title="Team">
                            <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                                {event.team.map((m) => <li key={m.email} className="flex justify-between gap-3 py-2"><span className="truncate">{m.name || m.email}</span><span className="text-ink/55 dark:text-white/55">{m.role} · {inviteStatus(m.status)}</span></li>)}
                            </ul>
                        </Section>
                    ) : null}
                    {event.guests.length ? (
                        <Section title="Guests">
                            <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                                {event.guests.map((g) => <li key={g._id} className="flex justify-between gap-3 py-2"><span>{g.name}</span><span className="text-ink/55 dark:text-white/55">{g.status}</span></li>)}
                            </ul>
                        </Section>
                    ) : null}
                </>
            )}
            <ConfirmModal open={Boolean(action)} title={copy.title} body={copy.body} confirmLabel={copy.label} tone={copy.tone === 'danger' ? 'danger' : 'coral'} busy={busy} onConfirm={run} onCancel={() => { setAction(null); setNote(''); }}>
                {copy.note ? (
                    <div className="mt-4">
                        <Field label="Note for the organizer (required)">
                            <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                ) : null}
            </ConfirmModal>
        </Drawer>
    );
}

function EventsTab() {
    const list = useAdminList('/events', { status: 'all', featured: 'all' });
    const [openId, setOpenId] = useState(null);
    const { params, setParam } = list;
    const pending = list.extra.counts?.review_pending || 0;
    return (
        <div className="space-y-5">
            {pending && params.status !== 'review_pending' ? (
                <button type="button" onClick={() => setParam('status', 'review_pending')} className="w-full border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {pending} event{pending === 1 ? '' : 's'} waiting for review →
                </button>
            ) : null}
            <Toolbar
                search={params.q}
                onSearch={(v) => setParam('q', v)}
                placeholder="Search title, city or category"
                filters={[
                    { label: 'Status', value: params.status, onChange: (v) => setParam('status', v), options: [['all', 'All'], ...Object.entries(STATUS_LABEL)] },
                    { label: 'Featured', value: params.featured, onChange: (v) => setParam('featured', v), options: [['all', 'All'], ['yes', 'Yes'], ['no', 'No']] }
                ]}
                csv={{ path: '/events', params, filename: 'events' }}
            />
            <DataTable
                loading={list.loading}
                rows={list.rows}
                onRowClick={(r) => setOpenId(r._id)}
                columns={[
                    { key: 'title', label: 'Event', render: (r) => <><p className="font-bold">{r.featured ? <Star size={12} className="mr-1 inline fill-butter text-amber-600" aria-label="Featured" /> : null}{r.title}</p><p className="text-xs text-ink/50 dark:text-white/50">{r.organizer?.email}</p></> },
                    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
                    { key: 'starts_at', label: 'Starts', render: (r) => dateTime(r.starts_at) },
                    { key: 'city', label: 'City' },
                    { key: 'sold', label: 'Sold', align: 'right', render: (r) => `${r.sold}/${r.capacity || '∞'}` }
                ]}
            />
            <Pagination pagination={list.pagination} onPage={(p) => setParam('page', p)} />
            <EventDrawer id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />
        </div>
    );
}

/** Categories / cities: small lists, edited inline. */
function CatalogTab({ kind }) {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const path = kind === 'categories' ? '/catalog/categories' : '/catalog/cities';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null); // {} for new, row for edit
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});
    const canEdit = admin.role !== 'support';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setRows((await api.get(path)).data.result);
        } catch (failure) {
            toast.error(errorText(failure, 'Could not load.'));
        } finally {
            setLoading(false);
        }
    }, [path]);
    useEffect(() => { load(); }, [load]);

    const open = (row) => {
        setEditing(row || {});
        setErrors({});
        setForm(row ? { name: row.name, country: row.country, status: row.active ? 1 : 0 } : { name: '', country: 'India', status: 1 });
    };
    const save = async () => {
        try {
            const body = kind === 'categories' ? { name: form.name, status: Number(form.status) } : { name: form.name, country: form.country, status: Number(form.status) };
            if (editing._id) await api.patch(`${path}/${editing._id}`, body);
            else await api.post(path, body);
            toast.success('Saved');
            setEditing(null);
            load();
        } catch (failure) {
            setErrors(failure.response?.data?.errors || {});
            toast.error(errorText(failure, 'Could not save.'));
        }
    };

    return (
        <div className="space-y-5">
            {canEdit ? <div><Button tone="dark" onClick={() => open(null)}><Plus size={13} /> Add {kind === 'categories' ? 'category' : 'city'}</Button></div> : null}
            <DataTable
                minWidth={480}
                loading={loading}
                rows={rows}
                onRowClick={canEdit ? open : undefined}
                columns={kind === 'categories'
                    ? [
                        { key: 'name', label: 'Category', render: (r) => <span className="font-bold">{r.name}</span> },
                        { key: 'events', label: 'Events', align: 'right' },
                        { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'green' : 'ink'}>{r.active ? 'Active' : 'Hidden'}</Badge> }
                    ]
                    : [
                        { key: 'name', label: 'City', render: (r) => <span className="font-bold">{r.name}</span> },
                        { key: 'country', label: 'Country' },
                        { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'green' : 'ink'}>{r.active ? 'Active' : 'Hidden'}</Badge> }
                    ]}
            />
            <Drawer
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
                eyebrow={kind === 'categories' ? 'Category' : 'City'}
                title={editing?._id ? `Edit ${editing.name}` : 'New'}
                footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button tone="primary" className="ml-auto" onClick={save}>Save</Button></>}
            >
                <div className="space-y-4">
                    <Field label="Name" error={errors.name}><input value={form.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} /></Field>
                    {kind === 'cities' ? <Field label="Country" error={errors.country}><input value={form.country || ''} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputCls} /></Field> : null}
                    <Field label="Status">
                        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                            <option value={1}>Active — shown in filters and event creation</option>
                            <option value={0}>Hidden</option>
                        </select>
                    </Field>
                </div>
            </Drawer>
        </div>
    );
}

const TABS = [['events', 'Events'], ['categories', 'Categories'], ['cities', 'Cities']];

export default function AdminEvents() {
    const [tab, setTab] = useState('events');
    return (
        <div className="space-y-5">
            <PageHead eyebrow="Catalog" title="Events" />
            <div className="flex gap-2" role="tablist">
                {TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                        className={`px-3 py-2 text-xs font-extrabold uppercase tracking-wider ${tab === id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-ink/15 dark:border-white/15'}`}>
                        {label}
                    </button>
                ))}
            </div>
            {tab === 'events' ? <EventsTab /> : <CatalogTab key={tab} kind={tab} />}
        </div>
    );
}
