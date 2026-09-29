import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { Badge, Button, DataTable, Drawer, Field, PageHead, Pagination, Toolbar, day, errorText, inputCls, useAdminList } from '../components/kit.jsx';

const discount = (c) => (c.discount_type === 'percentage' ? `${c.discount_value}% off` : `${money(c.discount_value)} off`);
const blank = { code: '', discount_type: 'percentage', discount_value: '', max_uses: '', starts_at: '', expires_at: '', active: true };

function CouponForm({ coupon, onClose, onSaved }) {
    const toast = useToast();
    const isNew = !coupon._id;
    const eventCoupon = coupon.scope === 'event';
    const [form, setForm] = useState(isNew ? blank : {
        code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value,
        max_uses: coupon.max_uses ?? '', starts_at: coupon.starts_at?.slice(0, 10) || '', expires_at: coupon.expires_at?.slice(0, 10) || '', active: coupon.active
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const save = async () => {
        setBusy(true);
        setErrors({});
        const body = eventCoupon ? { active: form.active } : {
            ...(isNew ? { code: form.code.trim() } : {}),
            discount_type: form.discount_type,
            discount_value: Number(form.discount_value),
            max_uses: form.max_uses === '' ? null : Number(form.max_uses),
            starts_at: form.starts_at || null,
            expires_at: form.expires_at || null,
            active: form.active
        };
        try {
            if (isNew) await api.post('/coupons', body);
            else await api.patch(`/coupons/${coupon._id}`, body);
            toast.success(isNew ? 'Coupon created' : 'Coupon updated');
            onSaved();
        } catch (failure) {
            setErrors(failure.response?.data?.errors || {});
            toast.error(errorText(failure, 'Could not save the coupon.'));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await api.del(`/coupons/${coupon._id}`);
            toast.success('Coupon deleted');
            onSaved();
        } catch (failure) {
            toast.error(errorText(failure, 'Could not delete.'));
            setConfirmDelete(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Drawer
            open
            onClose={onClose}
            eyebrow={eventCoupon ? `Event coupon · ${coupon.event?.title || ''}` : 'Platform coupon'}
            title={isNew ? 'New coupon' : coupon.code}
            footer={<>
                {!isNew && !eventCoupon ? <Button tone="danger" onClick={() => setConfirmDelete(true)}><Trash2 size={13} /> Delete</Button> : null}
                <Button className="ml-auto" onClick={onClose}>Cancel</Button>
                <Button tone="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </>}
        >
            {eventCoupon ? (
                <p className="mb-5 border-l-2 border-ink/30 bg-ink/5 px-3 py-2 text-sm dark:bg-white/5">
                    This coupon belongs to the organizer. You can switch it off; its terms can only be changed by them. {discount(coupon)}, used {coupon.used} time{coupon.used === 1 ? '' : 's'}.
                </p>
            ) : (
                <div className="space-y-4">
                    <Field label="Code" error={errors.code} hint="Letters, numbers, - and _. Shoppers type this at checkout.">
                        <input value={form.code} onChange={set('code')} disabled={!isNew} className={`${inputCls} uppercase`} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Type" error={errors.discount_type}>
                            <select value={form.discount_type} onChange={set('discount_type')} className={inputCls}>
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed amount (₹)</option>
                            </select>
                        </Field>
                        <Field label={form.discount_type === 'percentage' ? 'Percent off' : 'Rupees off'} error={errors.discount_value}>
                            <input type="number" min="0" value={form.discount_value} onChange={set('discount_value')} className={inputCls} />
                        </Field>
                    </div>
                    <Field label="Max uses" error={errors.max_uses} hint="Leave empty for unlimited.">
                        <input type="number" min="1" value={form.max_uses} onChange={set('max_uses')} className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Starts" error={errors.starts_at}><input type="date" value={form.starts_at} onChange={set('starts_at')} className={inputCls} /></Field>
                        <Field label="Expires" error={errors.expires_at}><input type="date" value={form.expires_at} onChange={set('expires_at')} className={inputCls} /></Field>
                    </div>
                </div>
            )}
            <label className="mt-5 flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={form.active} onChange={set('active')} className="h-4 w-4 accent-coral" /> Active
            </label>
            <ConfirmModal open={confirmDelete} title={`Delete ${coupon.code}?`} body="It stops working immediately. Coupons that have been used can't be deleted — switch them off instead." confirmLabel="Delete" tone="danger" busy={busy} onConfirm={remove} onCancel={() => setConfirmDelete(false)} />
        </Drawer>
    );
}

export default function AdminCoupons() {
    const { admin } = useAdminAuth();
    const list = useAdminList('/coupons', { scope: 'all', active: 'all' });
    const [editing, setEditing] = useState(null);
    const { params, setParam } = list;
    const canEdit = admin.role !== 'support';
    return (
        <div className="space-y-5">
            <PageHead eyebrow="Marketing" title="Coupons">
                {canEdit ? <Button tone="dark" onClick={() => setEditing({})}><Plus size={13} /> New platform coupon</Button> : null}
            </PageHead>
            <p className="border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                Checkout doesn't apply coupon codes yet, so coupons are saved and tracked but don't change prices.
            </p>
            <Toolbar
                search={params.q}
                onSearch={(v) => setParam('q', v)}
                placeholder="Search code"
                filters={[
                    { label: 'Scope', value: params.scope, onChange: (v) => setParam('scope', v), options: [['all', 'All'], ['platform', 'Platform'], ['event', 'Event']] },
                    { label: 'Active', value: params.active, onChange: (v) => setParam('active', v), options: [['all', 'All'], ['yes', 'Active'], ['no', 'Off']] }
                ]}
                csv={{ path: '/coupons', params, filename: 'coupons' }}
            />
            <DataTable
                loading={list.loading}
                rows={list.rows}
                onRowClick={canEdit ? setEditing : undefined}
                columns={[
                    { key: 'code', label: 'Code', render: (r) => <span className="font-mono font-bold">{r.code}</span> },
                    { key: 'scope', label: 'Scope', render: (r) => (r.scope === 'platform' ? <Badge tone="coral">Platform</Badge> : <span className="text-sm">{r.event?.title || 'Event'}</span>) },
                    { key: 'discount', label: 'Discount', render: discount },
                    { key: 'used', label: 'Used', align: 'right', render: (r) => `${r.used}${r.max_uses ? ` / ${r.max_uses}` : ''}` },
                    { key: 'expires_at', label: 'Expires', render: (r) => (r.expires_at ? day(r.expires_at) : 'Never') },
                    { key: 'active', label: 'Status', render: (r) => <Badge tone={r.active ? 'green' : 'ink'}>{r.active ? 'Active' : 'Off'}</Badge> }
                ]}
            />
            <Pagination pagination={list.pagination} onPage={(p) => setParam('page', p)} />
            {editing ? <CouponForm coupon={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} /> : null}
        </div>
    );
}
