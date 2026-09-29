import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrapList } from '../lib/unwrap.js';
import { formatDateTime } from '../lib/datetime.js';
import { useToast } from '../components/ui/Toast.jsx';

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
        <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-5">
                <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Inbox</p>
                    <h1 className="serif mt-1 text-5xl">Notifications</h1>
                </div>
                {unread > 0 ? (
                    <button
                        type="button"
                        onClick={markAllRead}
                        className="inline-flex items-center gap-2 border border-ink/15 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider hover:border-coral"
                    >
                        <CheckCheck size={14} /> Mark all read
                    </button>
                ) : null}
            </div>

            {loading ? (
                <div className="mt-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse bg-ink/5" />
                    ))}
                </div>
            ) : !rows.length ? (
                <div className="mt-16 text-center text-ink/50">
                    <Bell size={28} className="mx-auto text-ink/25" />
                    <p className="mt-3 text-sm">You're all caught up.</p>
                </div>
            ) : (
                <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
                    {rows.map((row) => (
                        <li key={row._id}>
                            <button
                                type="button"
                                onClick={() => open(row)}
                                className={`flex w-full gap-3 px-2 py-4 text-left transition hover:bg-ink/5 ${row.readAt ? '' : 'bg-coral/5'}`}
                            >
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.readAt ? 'bg-transparent' : 'bg-coral'}`} />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-extrabold">{row.title || 'Notification'}</span>
                                    <span className="mt-0.5 block text-sm text-ink/65">{row.message}</span>
                                    <span className="mt-1 block text-xs text-ink/40">{formatDateTime(row.createdAt)}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
