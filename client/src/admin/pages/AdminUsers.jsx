import { useState } from 'react';
import { Plus } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { Badge, Button, DataTable, Drawer, Field, PageHead, Pagination, Toolbar, dateTime, errorText, inputCls, useAdminList } from '../components/kit.jsx';

const ROLES = [['super_admin', 'Super admin'], ['admin', 'Admin'], ['support', 'Support']];
const ROLE_LABEL = Object.fromEntries(ROLES);
const ROLE_HELP = {
    super_admin: 'Everything, including managing admins and changing user roles.',
    admin: 'Moderate users and events, refunds, coupons, settlements, broadcasts, audit log.',
    support: 'Read-only across the console, plus resending tickets.'
};

function AdminForm({ target, onClose, onSaved }) {
    const { admin: me } = useAdminAuth();
    const toast = useToast();
    const isNew = !target._id;
    const self = !isNew && String(target._id) === String(me._id);
    const [form, setForm] = useState(isNew ? { name: '', email: '', role: 'support', password: '' } : { role: target.role, status: target.status, password: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const save = async () => {
        setBusy(true);
        setErrors({});
        try {
            if (isNew) await api.post('/admins', form);
            else {
                const body = {};
                if (form.role !== target.role) body.role = form.role;
                if (form.status !== target.status) body.status = form.status;
                if (form.password) body.password = form.password;
                if (!Object.keys(body).length) return onClose();
                await api.patch(`/admins/${target._id}`, body);
            }
            toast.success(isNew ? 'Admin created' : 'Admin updated');
            onSaved();
        } catch (failure) {
            setErrors(failure.response?.data?.errors || {});
            toast.error(errorText(failure, 'Could not save.'));
            setConfirm(false);
        } finally {
            setBusy(false);
        }
    };

    const risky = !isNew && (form.status === 'disabled' && target.status !== 'disabled' || form.role !== target.role);

    return (
        <Drawer
            open
            onClose={onClose}
            eyebrow="Admin account"
            title={isNew ? 'New admin' : target.name}
            footer={<><Button onClick={onClose}>Cancel</Button><Button tone="primary" className="ml-auto" disabled={busy} onClick={() => (risky ? setConfirm(true) : save())}>{busy ? 'Saving…' : 'Save'}</Button></>}
        >
            <div className="space-y-4">
                {isNew ? (
                    <>
                        <Field label="Name" error={errors.name}><input value={form.name} onChange={set('name')} className={inputCls} /></Field>
                        <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set('email')} className={inputCls} /></Field>
                    </>
                ) : <p className="text-sm text-ink/60 dark:text-white/60">{target.email}</p>}
                <Field label="Role" error={errors.role} hint={ROLE_HELP[form.role]}>
                    <select value={form.role} onChange={set('role')} disabled={self} className={inputCls}>
                        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </Field>
                {!isNew ? (
                    <Field label="Status" hint={self ? "You can't change your own role or status." : 'Disabled admins are signed out and can’t sign in.'}>
                        <select value={form.status} onChange={set('status')} disabled={self} className={inputCls}>
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </Field>
                ) : null}
                <Field label={isNew ? 'Temporary password' : 'Reset password (optional)'} error={errors.password} hint="12+ characters with a letter and a number. Share it privately.">
                    <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} className={inputCls} />
                </Field>
            </div>
            <ConfirmModal
                open={confirm}
                title={`Update ${target.name}?`}
                body={form.status === 'disabled' ? 'They are signed out immediately.' : `Their access changes to ${ROLE_LABEL[form.role]}.`}
                confirmLabel="Update"
                tone={form.status === 'disabled' ? 'danger' : 'coral'}
                busy={busy}
                onConfirm={save}
                onCancel={() => setConfirm(false)}
            />
        </Drawer>
    );
}

export default function AdminAdmins() {
    const list = useAdminList('/admins', { role: 'all' });
    const [editing, setEditing] = useState(null);
    const { params, setParam } = list;
    return (
        <div className="space-y-5">
            <PageHead eyebrow="Access" title="Admin users">
                <Button tone="dark" onClick={() => setEditing({})}><Plus size={13} /> Add admin</Button>
            </PageHead>
            <Toolbar
                search={params.q}
                onSearch={(v) => setParam('q', v)}
                placeholder="Search name or email"
                filters={[{ label: 'Role', value: params.role, onChange: (v) => setParam('role', v), options: [['all', 'All'], ...ROLES] }]}
                csv={{ path: '/admins', params, filename: 'admins' }}
            />
            <DataTable
                minWidth={620}
                loading={list.loading}
                rows={list.rows}
                onRowClick={setEditing}
                columns={[
                    { key: 'name', label: 'Admin', render: (r) => <><p className="font-bold">{r.name}</p><p className="text-xs text-ink/50 dark:text-white/50">{r.email}</p></> },
                    { key: 'role', label: 'Role', render: (r) => <Badge tone={r.role === 'super_admin' ? 'coral' : r.role === 'admin' ? 'blue' : 'ink'}>{ROLE_LABEL[r.role]}</Badge> },
                    { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'green' : 'red'}>{r.status}</Badge> },
                    { key: 'last_login_at', label: 'Last sign-in', render: (r) => dateTime(r.last_login_at) }
                ]}
            />
            <Pagination pagination={list.pagination} onPage={(p) => setParam('page', p)} />
            {editing ? <AdminForm target={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} /> : null}
        </div>
    );
}
