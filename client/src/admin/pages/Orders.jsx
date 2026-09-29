import { useState } from 'react';
import { Send, Undo2 } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
    Badge, Button, DataTable, Drawer, Facts, Field, PageHead, Pagination, Section, Toolbar,
    dateTime, errorText, inputCls, useAdminList, useDetail
} from '../components/kit.jsx';

const STATUS_TONE = { paid: 'green', pending: 'amber', cancelled: 'ink', refunded: 'red' };
const TICKET_TONE = { valid: 'green', used: 'blue', cancelled: 'red' };
const REFUND_HOW = {
    razorpay: 'The full amount goes back to the buyer through Razorpay.',
    stripe: 'The full amount goes back to the buyer through Stripe.',
    manual: 'This was paid in cash or at the gate, so no money moves automatically — pay the buyer back yourself. The order is marked refunded.'
};

function OrderDrawer({ id, onClose, onChanged }) {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const [order, reload] = useDetail(id ? `/orders/${id}` : null);
    const [confirm, setConfirm] = useState(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async () => {
        setBusy(true);
        try {
            const res = confirm === 'refund'
                ? await api.post(`/orders/${id}/refund`, { reason: reason.trim() })
                : await api.post(`/orders/${id}/resend`);
            toast.success(res.data.message);
            setConfirm(null);
            setReason('');
            await reload();
            onChanged();
        } catch (failure) {
            toast.error(errorText(failure, 'Action failed.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Drawer
            open={Boolean(id)}
            onClose={onClose}
            eyebrow="Order"
            title={order?.order_number || '…'}
            footer={order ? (
                <>
                    {order.status === 'paid' ? <Button onClick={() => setConfirm('resend')}><Send size={13} /> Resend tickets</Button> : null}
                    {order.can_refund && admin.role !== 'support' ? <Button tone="danger" className="ml-auto" onClick={() => setConfirm('refund')}><Undo2 size={13} /> Refund {money(order.total)}</Button> : null}
                </>
            ) : null}
        >
            {!order ? <div className="h-64 animate-pulse bg-ink/5 dark:bg-white/5" /> : (
                <>
                    <div className="flex flex-wrap gap-2">
                        <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                        <Badge>{order.source}</Badge>
                    </div>
                    {order.refund ? (
                        <p className="mt-4 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
                            Refunded {dateTime(order.refund.at)} via {order.refund.method}{order.refund.reference ? ` (${order.refund.reference})` : ''}: {order.refund.reason}
                        </p>
                    ) : null}
                    <div className="mt-5">
                        <Facts items={[
                            ['Buyer', order.buyer?.email || '—'],
                            ['Event', order.event?.title || '—'],
                            ['Total', money(order.total)],
                            ['Placed', dateTime(order.created_at)]
                        ]} />
                    </div>
                    <Section title="Items">
                        <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                            {order.items.map((i, n) => <li key={n} className="flex justify-between py-2"><span>{i.quantity} × {i.name}</span><span className="tabular-nums">{money(i.quantity * i.unit_price)}</span></li>)}
                        </ul>
                    </Section>
                    <Section title={`Tickets (${order.ticket_list.length})`}>
                        <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                            {order.ticket_list.map((t) => (
                                <li key={t._id} className="flex items-center justify-between gap-3 py-2">
                                    <span className="font-mono text-xs">{t.code}</span>
                                    <span className="flex items-center gap-2">{t.scanned_at ? <span className="text-xs text-ink/50 dark:text-white/50">scanned {dateTime(t.scanned_at)}</span> : null}<Badge tone={TICKET_TONE[t.status]}>{t.status}</Badge></span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                </>
            )}
            <ConfirmModal
                open={Boolean(confirm)}
                title={confirm === 'refund' ? `Refund ${money(order?.total || 0)}?` : 'Resend tickets to the buyer?'}
                body={confirm === 'refund' ? `${REFUND_HOW[order?.refund_via] || ''} All tickets on this order are cancelled and the seats go back on sale. This can't be undone.` : 'They get an in-app notification with their ticket codes.'}
                confirmLabel={confirm === 'refund' ? 'Refund' : 'Resend'}
                tone={confirm === 'refund' ? 'danger' : 'coral'}
                busy={busy}
                onConfirm={run}
                onCancel={() => { setConfirm(null); setReason(''); }}
            >
                {confirm === 'refund' ? (
                    <div className="mt-4">
                        <Field label="Reason (required)">
                            <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                ) : null}
            </ConfirmModal>
        </Drawer>
    );
}

export default function AdminOrders() {
    const list = useAdminList('/orders', { status: 'all', source: 'all' });
    const [openId, setOpenId] = useState(null);
    const { params, setParam } = list;
    return (
        <div className="space-y-5">
            <PageHead eyebrow="Sales" title="Orders & tickets" />
            <Toolbar
                search={params.q}
                onSearch={(v) => setParam('q', v)}
                placeholder="Order number, buyer email or name"
                filters={[
                    { label: 'Status', value: params.status, onChange: (v) => setParam('status', v), options: [['all', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']] },
                    { label: 'Source', value: params.source, onChange: (v) => setParam('source', v), options: [['all', 'All'], ['online', 'Online'], ['cash', 'Cash / gate']] }
                ]}
                csv={{ path: '/orders', params, filename: 'orders' }}
            />
            <DataTable
                loading={list.loading}
                rows={list.rows}
                onRowClick={(r) => setOpenId(r._id)}
                columns={[
                    { key: 'order_number', label: 'Order', render: (r) => <><p className="font-mono text-xs font-bold">{r.order_number}</p><p className="text-xs text-ink/50 dark:text-white/50">{dateTime(r.created_at)}</p></> },
                    { key: 'buyer', label: 'Buyer', render: (r) => <><p className="font-bold">{r.buyer?.name}</p><p className="text-xs text-ink/50 dark:text-white/50">{r.buyer?.email}</p></> },
                    { key: 'event', label: 'Event', render: (r) => r.event?.title },
                    { key: 'source', label: 'Source', render: (r) => <Badge>{r.source}</Badge> },
                    { key: 'status', label: 'Status', render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
                    { key: 'total', label: 'Total', align: 'right', render: (r) => <><p className="font-bold">{money(r.total)}</p><p className="text-xs text-ink/50 dark:text-white/50">{r.tickets} tix</p></> }
                ]}
            />
            <Pagination pagination={list.pagination} onPage={(p) => setParam('page', p)} />
            <OrderDrawer id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />
        </div>
    );
}
