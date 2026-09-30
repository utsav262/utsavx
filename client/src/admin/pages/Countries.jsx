import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { Badge, Button, DataTable, Drawer, Field, PageHead, Section, day, errorText, inputCls } from '../components/kit.jsx';

const blank = {
    country: '', currency: 'INR', payment_gateway: 'razorpay',
    Online_Service_Fee_percentage: 5, Online_Service_Fee_dollar_amount: 0,
    Online_Payment_Fee_percentage: 2, Online_Payment_Fee_dollar_amount: 0,
    timezones: [{ label: 'India Standard Time', value: 'Asia/Kolkata' }],
    verified_ambassador_unlock_fee: 0, ticket_outlet_unlock_fee: 0, boost_package_unlock_fee: 0, complimentary_ticket_bundles: 0
};
const NUMBER_FIELDS = [
    'Online_Service_Fee_percentage', 'Online_Service_Fee_dollar_amount', 'Online_Payment_Fee_percentage', 'Online_Payment_Fee_dollar_amount',
    'verified_ambassador_unlock_fee', 'ticket_outlet_unlock_fee', 'boost_package_unlock_fee', 'complimentary_ticket_bundles'
];
const rate = (pct, flat, currency) => [pct ? `${pct}%` : null, flat ? `${currency} ${flat}` : null].filter(Boolean).join(' + ') || 'Free';
const firstError = (e) => (Array.isArray(e) ? e[0] : e);

function NumberField({ label, name, form, setForm, errors, suffix, hint }) {
    return (
        <Field label={label} error={firstError(errors[name])} hint={hint}>
            <div className="flex items-center">
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form[name]}
                    onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                    className={inputCls}
                />
                {suffix ? <span className="ml-2 w-10 shrink-0 text-xs font-bold text-ink/50 dark:text-white/50">{suffix}</span> : null}
            </div>
        </Field>
    );
}

function CountryForm({ row, canEdit, onClose, onSaved }) {
    const toast = useToast();
    const isNew = !row._id;
    const [form, setForm] = useState(isNew ? blank : { ...blank, ...row, timezones: row.timezones?.length ? row.timezones : blank.timezones });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null); // 'save' | 'delete'
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const setZone = (i, key, value) => setForm((f) => ({ ...f, timezones: f.timezones.map((z, n) => (n === i ? { ...z, [key]: value } : z)) }));

    const body = () => ({
        country: form.country.trim(),
        currency: form.currency.trim(),
        payment_gateway: form.payment_gateway,
        timezones: form.timezones.map((z) => ({ label: z.label.trim(), value: z.value.trim() })).filter((z) => z.label || z.value),
        ...Object.fromEntries(NUMBER_FIELDS.map((k) => [k, Number(form[k]) || 0]))
    });

    const save = async () => {
        setBusy(true);
        setErrors({});
        try {
            if (isNew) await api.post('/catalog/countries', body());
            else await api.patch(`/catalog/countries/${row._id}`, body());
            toast.success(isNew ? 'Country added' : 'Fees saved — they apply to new sales right away');
            onSaved();
        } catch (failure) {
            setErrors(failure.response?.data?.errors || {});
            toast.error(errorText(failure, 'Could not save.'));
            setConfirm(null);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await api.del(`/catalog/countries/${row._id}`);
            toast.success('Country deleted');
            onSaved();
        } catch (failure) {
            toast.error(errorText(failure, 'Could not delete.'));
            setConfirm(null);
        } finally {
            setBusy(false);
        }
    };

    const cur = form.currency || '';
    const disabled = !canEdit;

    return (
        <Drawer
            open
            onClose={onClose}
            eyebrow={isNew ? 'New country' : `Country #${row.country_id}`}
            title={isNew ? 'Add country' : row.country}
            footer={canEdit ? (
                <>
                    {!isNew ? <Button tone="danger" onClick={() => setConfirm('delete')}><Trash2 size={13} /> Delete</Button> : null}
                    <Button className="ml-auto" onClick={onClose}>Cancel</Button>
                    <Button tone="primary" disabled={busy} onClick={() => (isNew ? save() : setConfirm('save'))}>{busy ? 'Saving…' : 'Save'}</Button>
                </>
            ) : null}
        >
            {!canEdit ? (
                <p className="mb-5 border-l-2 border-ink/30 bg-ink/5 px-3 py-2 text-sm dark:bg-white/5">Only super admins can change countries and fees.</p>
            ) : null}
            <fieldset disabled={disabled} className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Country" error={firstError(errors.country)} hint={row.events ? `${row.events} event(s) use this name, so it can’t be renamed.` : null}>
                        <input value={form.country} onChange={set('country')} className={inputCls} />
                    </Field>
                    <Field label="Currency" error={firstError(errors.currency)}>
                        <input value={form.currency} maxLength={3} onChange={set('currency')} className={`${inputCls} uppercase`} />
                    </Field>
                </div>
                <Field label="Payment gateway" error={firstError(errors.payment_gateway)}>
                    <select value={form.payment_gateway} onChange={set('payment_gateway')} className={inputCls}>
                        <option value="razorpay">Razorpay</option>
                        <option value="stripe">Stripe</option>
                    </select>
                </Field>

                <Section title="Service fee (UTSAVX)">
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Percent" name="Online_Service_Fee_percentage" suffix="%" form={form} setForm={setForm} errors={errors} />
                        <NumberField label="Flat per ticket" name="Online_Service_Fee_dollar_amount" suffix={cur} form={form} setForm={setForm} errors={errors} />
                    </div>
                </Section>
                <Section title="Online payment processing">
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Percent" name="Online_Payment_Fee_percentage" suffix="%" form={form} setForm={setForm} errors={errors} />
                        <NumberField label="Flat per ticket" name="Online_Payment_Fee_dollar_amount" suffix={cur} form={form} setForm={setForm} errors={errors} />
                    </div>
                </Section>

                <Section title="Time zones">
                    <div className="space-y-2">
                        {form.timezones.map((z, i) => (
                            <div key={i} className="flex gap-2">
                                <input aria-label="Time zone label" placeholder="India Standard Time" value={z.label} onChange={(e) => setZone(i, 'label', e.target.value)} className={inputCls} />
                                <input aria-label="Time zone ID" placeholder="Asia/Kolkata" value={z.value} onChange={(e) => setZone(i, 'value', e.target.value)} className={`${inputCls} font-mono`} />
                                {form.timezones.length > 1 ? (
                                    <button type="button" aria-label="Remove time zone" onClick={() => setForm((f) => ({ ...f, timezones: f.timezones.filter((_, n) => n !== i) }))} className="px-2 text-ink/40 hover:text-red-500">
                                        <X size={15} />
                                    </button>
                                ) : null}
                            </div>
                        ))}
                        {firstError(errors.timezones) ? <p className="text-xs text-red-600">{firstError(errors.timezones)}</p> : null}
                        {canEdit && form.timezones.length < 10 ? (
                            <button type="button" onClick={() => setForm((f) => ({ ...f, timezones: [...f.timezones, { label: '', value: '' }] }))} className="text-xs font-extrabold uppercase tracking-wider text-coral">
                                + Add time zone
                            </button>
                        ) : null}
                    </div>
                </Section>

                <Section title="Add-on prices">
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Verified ambassadors unlock" name="verified_ambassador_unlock_fee" suffix={cur} form={form} setForm={setForm} errors={errors} />
                        <NumberField label="Ticket outlets unlock" name="ticket_outlet_unlock_fee" suffix={cur} form={form} setForm={setForm} errors={errors} />
                        <NumberField label="Boost package" name="boost_package_unlock_fee" suffix={cur} form={form} setForm={setForm} errors={errors} />
                        <NumberField label="Complimentary ticket bundles" name="complimentary_ticket_bundles" form={form} setForm={setForm} errors={errors} />
                    </div>
                </Section>
            </fieldset>

            <ConfirmModal
                open={confirm === 'save'}
                title={`Change ${row.country} fees?`}
                body={`New rates apply to sales from now on, and show on the public Pricing page. Service fee: ${rate(Number(form.Online_Service_Fee_percentage), Number(form.Online_Service_Fee_dollar_amount), cur)}. Processing: ${rate(Number(form.Online_Payment_Fee_percentage), Number(form.Online_Payment_Fee_dollar_amount), cur)}.`}
                confirmLabel="Save fees"
                busy={busy}
                onConfirm={save}
                onCancel={() => setConfirm(null)}
            />
            <ConfirmModal
                open={confirm === 'delete'}
                title={`Delete ${row.country}?`}
                body="Hosts can no longer pick it for new events. Countries that events already use can’t be deleted."
                confirmLabel="Delete"
                tone="danger"
                busy={busy}
                onConfirm={remove}
                onCancel={() => setConfirm(null)}
            />
        </Drawer>
    );
}

export default function AdminCountries() {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const canEdit = admin.role === 'super_admin';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            setRows((await api.get('/catalog/countries')).data.result || []);
        } catch (failure) {
            toast.error(errorText(failure, 'Could not load countries.'));
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    return (
        <div className="space-y-5">
            <PageHead eyebrow="Catalog" title="Countries & fees">
                {canEdit ? <Button tone="dark" onClick={() => setEditing({})}><Plus size={13} /> Add country</Button> : null}
            </PageHead>
            <p className="text-sm text-ink/60 dark:text-white/60">
                Each country sets the currency, time zones, payment gateway and fees for events held there. This is the list hosts pick from when creating an event.
            </p>
            <DataTable
                loading={loading}
                rows={rows}
                onRowClick={setEditing}
                empty="No countries yet."
                columns={[
                    { key: 'country', label: 'Country', render: (r) => <><p className="font-bold">{r.country}</p><p className="text-xs text-ink/50 dark:text-white/50">{r.timezones.map((z) => z.value).join(', ')}</p></> },
                    { key: 'currency', label: 'Currency', render: (r) => <span className="font-mono">{r.currency}</span> },
                    { key: 'service', label: 'Service fee', render: (r) => rate(r.Online_Service_Fee_percentage, r.Online_Service_Fee_dollar_amount, r.currency) },
                    { key: 'processing', label: 'Processing', render: (r) => rate(r.Online_Payment_Fee_percentage, r.Online_Payment_Fee_dollar_amount, r.currency) },
                    { key: 'gateway', label: 'Gateway', render: (r) => <Badge>{r.payment_gateway}</Badge> },
                    { key: 'events', label: 'Events', align: 'right', render: (r) => r.events },
                    { key: 'updated_at', label: 'Updated', render: (r) => day(r.updated_at) }
                ]}
            />
            {editing ? <CountryForm row={editing} canEdit={canEdit} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} /> : null}
        </div>
    );
}
