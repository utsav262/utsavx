import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrapList } from '../lib/unwrap.js';
import { formatDateTime } from '../lib/datetime.js';
import { useToast } from '../components/ui/Toast.jsx';
import { EmptyState, PageHeader, PageShell, buttonCls } from '../components/ui/Page.jsx';

/** Where tapping a notification should go. Only in-app paths are followed. */
function targetFor(row) {
    const type = row.notificationType || '';
    const eventId = row.payload?.eventId;
    const link = row.payload?.link;
    if (typeof link === 'string' && link.startsWith('/') && !link.startsWith('//')) return link;
    if (type === 'EVENT_HANDLER_INVITE') return '/invitations';
    if (type.startsWith('SETTLEMENT_')) return '/dashboard/settlements';
    if (type === 'ORDER_REFUNDED' || type === 'TICKETS_RESENT') return '/tickets';
    if ((type.startsWith('EVENT_HANDLER_') || type.startsWith('EVENT_')) && eventId) return `/dashboard/events/${eventId}`;
    return null;
}

export default function Notifications() {
    const navigate = useNavigate();
    const toast = useToast();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            setRows(unwrapList(await apiClient.notifications()));
        } catch {
            toast.error('Could not load notifications.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const markAllRead = async () => {
        try {
            await apiClient.markNotificationsRead();
            setRows((prev) => prev.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() })));
        } catch {
            toast.error('Could not update notifications.');
        }
    };

    const open = async (row) => {
        if (!row.readAt) {
            apiClient.markNotificationsRead([row._id]).catch(() => {});
            setRows((prev) => prev.map((item) => (item._id === row._id ? { ...item, readAt: new Date().toISOString() } : item)));
        }
        const to = targetFor(row);
        if (to) navigate(to);
    };

    const unread = rows.filter((row) => !row.readAt).length;

    return (
        <PageShell>
            <PageHeader
                eyebrow="Inbox"
                title="Notifications"
                description={unread ? `${unread} unread` : 'Approvals, team invites, refunds and settlement updates.'}
                actions={unread > 0 ? (
                    <button type="button" onClick={markAllRead} className={buttonCls.secondary}>
                        <CheckCheck size={14} /> Mark all read
                    </button>
                ) : null}
            />

            <div className="mt-6">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse bg-ink/5" />)}
                    </div>
                ) : !rows.length ? (
                    <EmptyState icon={Bell} title="You're all caught up" text="New approvals, team invites and payment updates will show up here." />
                ) : (
                    <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
                        {rows.map((row) => (
                            <li key={row._id}>
                                <button
                                    type="button"
                                    onClick={() => open(row)}
                                    className={`flex w-full gap-4 px-5 py-4 text-left transition hover:bg-ink/[0.03] ${row.readAt ? '' : 'bg-coral/[0.04]'}`}
                                >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.readAt ? 'bg-ink/15' : 'bg-coral'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                                            <span className={`text-sm ${row.readAt ? 'font-bold text-ink/80' : 'font-extrabold'}`}>{row.title || 'Notification'}</span>
                                            <span className="text-xs text-ink/40">{formatDateTime(row.createdAt)}</span>
                                        </span>
                                        <span className="mt-0.5 block text-sm text-ink/60">{row.message}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </PageShell>
    );
}
