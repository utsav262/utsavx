import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import {
    Badge, Button, DataTable, Drawer, Facts, Field, PageHead, Pagination, Section, Toolbar,
    day, errorText, inputCls, inviteStatus, useAdminList, useDetail
} from '../components/kit.jsx';

const ROLE_TONE = { customer: 'ink', organizer: 'coral', admin: 'blue' };

function UserDrawer({ id, onClose, onChanged }) {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const [user, reload] = useDetail(id ? `/users/${id}` : null);
    const [confirm, setConfirm] = useState(null); // { kind, value }
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const canAct = admin.role !== 'support';

    const apply = async () => {
        const body = confirm.kind === 'status' ? { status: confirm.value, reason: reason.trim() || undefined }
            : confirm.kind === 'role' ? { role: confirm.value } : { hostVerified: confirm.value };
        setBusy(true);
        try {
            await api.patch(`/users/${id}`, body);
            toast.success('User updated');
            setConfirm(null);
            setReason('');
            await reload();
            onChanged();
        } catch (failure) {
            toast.error(errorText(failure, 'Could not update the user.'));
        } finally {
            setBusy(false);
        }
    };

    const suspended = user?.status === 'suspended';
    const copy = !confirm ? {} : confirm.kind === 'status'
        ? (confirm.value === 'suspended'
            ? { title: `Suspend ${user.name}?`, body: 'They are signed out everywhere and can’t sign in or buy until reactivated.', label: 'Suspend', tone: 'danger' }
            : { title: `Reactivate ${user.name}?`, body: 'They can sign in and use the platform again.', label: 'Reactivate' })
        : confirm.kind === 'role'
            ? { title: `Make ${user.name} ${confirm.value === 'admin' ? 'a legacy admin' : `a ${confirm.value}`}?`, body: 'This changes what they can do on the site.', label: 'Change role' }
            : { title: confirm.value ? 'Mark as verified host?' : 'Remove host verification?', body: 'Verified hosts get a badge and can be targeted in broadcasts.', label: 'Confirm' };

    return (
        <Drawer
            open={Boolean(id)}
            onClose={onClose}
            eyebrow="User"
            title={user?.name || '…'}
            footer={user && canAct ? (
                <>
                    {suspended
                        ? <Button tone="primary" onClick={() => setConfirm({ kind: 'status', value: 'active' })}>Reactivate</Button>
                        : <Button tone="danger" onClick={() => setConfirm({ kind: 'status', value: 'suspended' })}>Suspend</Button>}
                    {user.role === 'organizer' ? (
                        <Button onClick={() => setConfirm({ kind: 'verify', value: !user.host_verified })}>
                            <BadgeCheck size={13} /> {user.host_verified ? 'Unverify host' : 'Verify host'}
                        </Button>
                    ) : null}
                    {admin.role === 'super_admin' ? (
                        <select
                            aria-label="Change role"
                            value=""
                            onChange={(e) => e.target.value && setConfirm({ kind: 'role', value: e.target.value })}
                            className={`${inputCls} ml-auto w-auto`}
                        >
                            <option value="">Change role…</option>
                            {['customer', 'organizer', 'admin'].filter((r) => r !== user.role).map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    ) : null}
                </>
            ) : null}
        >
            {!user ? <div className="h-64 animate-pulse bg-ink/5 dark:bg-white/5" /> : (
                <>
                    <p className="text-sm text-ink/60 dark:text-white/60">{user.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
                        <Badge tone={suspended ? 'red' : 'green'}>{user.status}</Badge>
                        {user.host_verified ? <Badge tone="blue">Verified host</Badge> : null}
                    </div>
                    {suspended ? (
                        <p className="mt-4 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
                            Suspended {day(user.suspended_at)}: {user.suspended_reason}
                        </p>
                    ) : null}
                    <div className="mt-6">
                        <Facts items={[
                            ['Joined', day(user.created_at)],
                            ['Paid orders', user.stats.paid_orders],
                            ['Total spent', money(user.stats.total_spent)],
                            ['Events hosted', user.stats.events_hosted]
                        ]} />
                    </div>
                    {user.events.length ? (
                        <Section title="Hosted events">
                            <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                                {user.events.map((e) => <li key={e._id} className="flex justify-between gap-3 py-2"><span className="truncate">{e.title}</span><Badge>{e.status}</Badge></li>)}
                            </ul>
                        </Section>
                    ) : null}
                    {user.team_roles.length ? (
                        <Section title="Team roles">
                            <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                                {user.team_roles.map((t, i) => <li key={i} className="flex justify-between gap-3 py-2"><span className="truncate">{t.event}</span><span className="text-ink/55 dark:text-white/55">{t.role} · {inviteStatus(t.status)}</span></li>)}
                            </ul>
                        </Section>
                    ) : null}
                    <Section title="Recent orders">
                        {user.orders.length ? (
                            <ul className="divide-y divide-ink/10 text-sm dark:divide-white/10">
                                {user.orders.map((o) => (
                                    <li key={o._id} className="flex items-center justify-between gap-3 py-2">
                                        <span className="min-w-0"><span className="font-mono text-xs">{o.order_number}</span><span className="block truncate text-xs text-ink/50 dark:text-white/50">{o.event} · {day(o.created_at)}</span></span>
                                        <span className="flex items-center gap-2"><span className="font-bold tabular-nums">{money(o.total)}</span><Badge tone={o.status === 'paid' ? 'green' : 'ink'}>{o.status}</Badge></span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-ink/50 dark:text-white/50">No orders yet.</p>}
                    </Section>
                </>
            )}
            <ConfirmModal open={Boolean(confirm)} title={copy.title} body={copy.body} confirmLabel={copy.label} tone={copy.tone} busy={busy} onConfirm={apply} onCancel={() => { setConfirm(null); setReason(''); }}>
                {confirm?.kind === 'status' && confirm.value === 'suspended' ? (
                    <div className="mt-4">
                        <Field label="Reason (required, shown in the audit log)">
                            <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
                        </Field>
                    </div>
                ) : null}
            </ConfirmModal>
        </Drawer>
    );
}

export default function AdminUsers() {
    const list = useAdminList('/users', { role: 'all', status: 'all', hostVerified: 'all' });
    const [openId, setOpenId] = useState(null);
    const { params, setParam } = list;
    return (
        <div className="space-y-5">
            <PageHead eyebrow="People" title="Users" />
            <Toolbar
                search={params.q}
                onSearch={(v) => setParam('q', v)}
                placeholder="Search name or email"
                filters={[
                    { label: 'Role', value: params.role, onChange: (v) => setParam('role', v), options: [['all', 'All'], ['customer', 'Customer'], ['organizer', 'Organizer'], ['admin', 'Legacy admin']] },
                    { label: 'Status', value: params.status, onChange: (v) => setParam('status', v), options: [['all', 'All'], ['active', 'Active'], ['suspended', 'Suspended']] },
                    { label: 'Host', value: params.hostVerified, onChange: (v) => setParam('hostVerified', v), options: [['all', 'All'], ['yes', 'Verified'], ['no', 'Unverified']] }
                ]}
                csv={{ path: '/users', params, filename: 'users' }}
            />
            <DataTable
                loading={list.loading}
                rows={list.rows}
                onRowClick={(r) => setOpenId(r._id)}
                columns={[
                    { key: 'name', label: 'Name', render: (r) => <><p className="font-bold">{r.name}{r.host_verified ? <BadgeCheck size={13} className="ml-1 inline text-sky" aria-label="Verified host" /> : null}</p><p className="text-xs text-ink/50 dark:text-white/50">{r.email}</p></> },
                    { key: 'role', label: 'Role', render: (r) => <Badge tone={ROLE_TONE[r.role]}>{r.role}</Badge> },
                    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'suspended' ? 'red' : 'green'}>{r.status}</Badge> },
                    { key: 'created_at', label: 'Joined', render: (r) => day(r.created_at) }
                ]}
            />
            <Pagination pagination={list.pagination} onPage={(p) => setParam('page', p)} />
            <UserDrawer id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />
        </div>
    );
}
