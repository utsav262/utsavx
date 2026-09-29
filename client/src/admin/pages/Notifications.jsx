import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { admin as api } from '../api.js';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { Button, DataTable, Field, PageHead, Pagination, dateTime, errorText, inputCls, useAdminList } from '../components/kit.jsx';

const SEGMENTS = [
    ['all', 'Everyone (active accounts)'],
    ['customers', 'Customers'],
    ['organizers', 'Organizers'],
    ['verified_hosts', 'Verified hosts'],
    ['event_attendees', "An event's ticket holders"]
];

export default function AdminNotifications() {
    const toast = useToast();
    const history = useAdminList('/notifications');
    const [form, setForm] = useState({ segment: 'all', event: '', title: '', message: '', link: '' });
    const [events, setEvents] = useState([]);
    const [count, setCount] = useState(null);
    const [errors, setErrors] = useState({});
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    useEffect(() => {
        api.get('/events', { status: 'published', limit: 100 }).then((res) => setEvents(res.data.result)).catch(() => {});
    }, []);

    useEffect(() => {
        setCount(null);
        if (form.segment === 'event_attendees' && !form.event) return undefined;
        const t = setTimeout(() => {
            api.post('/notifications/preview', { segment: form.segment, event: form.event || undefined })
                .then((res) => setCount(res.data.result.recipients))
                .catch(() => setCount(null));
        }, 200);
        return () => clearTimeout(t);
    }, [form.segment, form.event]);

    const send = async () => {
        setBusy(true);
        setErrors({});
        try {
            const res = await api.post('/notifications/send', { ...form, event: form.event || undefined, link: form.link || undefined });
            toast.success(res.data.message);
            setConfirm(false);
            setForm((f) => ({ ...f, title: '', message: '', link: '' }));
            history.reload();
        } catch (failure) {
            setErrors(failure.response?.data?.errors || {});
            toast.error(errorText(failure, 'Could not send.'));
            setConfirm(false);
        } finally {
            setBusy(false);
        }
    };

    const ready = form.title.trim().length >= 3 && form.message.trim().length >= 3 && count > 0;

    return (
        <div className="space-y-6">
            <PageHead eyebrow="Engagement" title="Notifications" />
            <section className="grid gap-6 border border-ink/10 bg-white p-5 dark:border-white/10 dark:bg-[#1b1b1b] lg:grid-cols-2">
                <div className="space-y-4">
                    <Field label="Send to" error={errors.segment}>
                        <select value={form.segment} onChange={set('segment')} className={inputCls}>
                            {SEGMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                    </Field>
                    {form.segment === 'event_attendees' ? (
                        <Field label="Event" error={errors.event}>
                            <select value={form.event} onChange={set('event')} className={inputCls}>
                                <option value="">Choose a published event…</option>
                                {events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
                            </select>
                        </Field>
                    ) : null}
                    <Field label="Title" error={errors.title}><input maxLength={80} value={form.title} onChange={set('title')} className={inputCls} /></Field>
                    <Field label="Message" error={errors.message} hint={`${form.message.length}/500`}>
                        <textarea rows={4} maxLength={500} value={form.message} onChange={set('message')} className={inputCls} />
                    </Field>
                    <Field label="Link (optional)" error={errors.link} hint="An in-app path, e.g. /events or /tickets">
                        <input value={form.link} onChange={set('link')} placeholder="/events" className={inputCls} />
                    </Field>
                </div>
                <div className="flex flex-col">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55 dark:text-white/55">Preview</p>
                    <div className="mt-2 border border-ink/10 bg-cream p-4 dark:border-white/10 dark:bg-[#111]">
                        <p className="font-extrabold">{form.title || 'Title'}</p>
                        <p className="mt-1 text-sm text-ink/65 dark:text-white/65">{form.message || 'Your message appears here.'}</p>
                    </div>
                    <p className="mt-4 text-sm text-ink/60 dark:text-white/60">
                        {count == null ? 'Counting recipients…' : `${count} ${count === 1 ? 'person' : 'people'} will get this in their Notifications inbox. Suspended accounts are skipped.`}
                    </p>
                    <p className="mt-1 text-xs text-ink/45 dark:text-white/45">In-app only — push and email aren't set up yet.</p>
                    <Button tone="primary" className="mt-auto self-start" disabled={!ready} onClick={() => setConfirm(true)}><Send size={13} /> Send</Button>
                </div>
            </section>

            <div>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55 dark:text-white/55">Sent</h2>
                <div className="mt-2 space-y-3">
                    <DataTable
                        minWidth={620}
                        loading={history.loading}
                        rows={history.rows}
                        empty="Nothing sent yet."
                        columns={[
                            { key: 'title', label: 'Announcement', render: (r) => <><p className="font-bold">{r.title}</p><p className="line-clamp-1 text-xs text-ink/50 dark:text-white/50">{r.message}</p></> },
                            { key: 'segment', label: 'Audience', render: (r) => (r.event ? `${r.segment_label}: ${r.event}` : r.segment_label) },
                            { key: 'recipients', label: 'Sent to', align: 'right' },
                            { key: 'sent_by', label: 'By' },
                            { key: 'created_at', label: 'When', render: (r) => dateTime(r.created_at) }
                        ]}
                    />
                    <Pagination pagination={history.pagination} onPage={(p) => history.setParam('page', p)} />
                </div>
            </div>

            <ConfirmModal
                open={confirm}
                title={`Send to ${count} ${count === 1 ? 'person' : 'people'}?`}
                body="Announcements can't be recalled once sent."
                confirmLabel="Send"
                busy={busy}
                onConfirm={send}
                onCancel={() => setConfirm(false)}
            />
        </div>
    );
}
