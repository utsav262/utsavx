import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BadgeCheck, Camera, KeyRound, Landmark, Pencil, Trash2, UserRound } from 'lucide-react';
import api from '../api/client.js';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { setUser } from '../store/index.js';
import { useToast } from '../components/ui/Toast.jsx';

const inputCls = 'w-full border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-coral disabled:bg-ink/5 disabled:text-ink/50';
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMPTY_BANK = { account_holder_name: '', bank_name: '', branch: '', account_number: '', ifsc: '', account_type: 'savings', upi_id: '' };

/** Avatars are served by the API, which lives on another origin in production. */
const avatarSrc = (url) => {
    if (!url || !url.startsWith('/api/v1/')) return url;
    return `${String(api.defaults.baseURL).replace(/\/api\/v1\/?$/, '')}${url}`;
};
const fieldErrors = (failure) => {
    const errors = failure.response?.data?.errors || {};
    return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
};

function Field({ label, error, hint, children }) {
    return (
        <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/50">{label}</span>
            <div className="mt-1.5">{children}</div>
            {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink/45">{hint}</span> : null}
        </label>
    );
}

function Card({ id, icon, title, subtitle, action, children }) {
    return (
        <section id={id} className="scroll-mt-24 border border-ink/10 bg-white">
            <header className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-coral">{icon}</span>
                    <div>
                        <h2 className="text-sm font-extrabold uppercase tracking-wider">{title}</h2>
                        {subtitle ? <p className="mt-0.5 text-sm text-ink/55">{subtitle}</p> : null}
                    </div>
                </div>
                {action}
            </header>
            <div className="px-5 py-5">{children}</div>
        </section>
    );
}

const SmallButton = ({ children, tone, ...props }) => (
    <button
        type="button"
        {...props}
        className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider transition disabled:opacity-50 ${
            tone === 'primary' ? 'border-ink bg-ink text-white hover:bg-coral hover:border-coral'
                : tone === 'danger' ? 'border-red-200 text-red-600 hover:border-red-500'
                    : 'border-ink/15 hover:border-coral'}`}
    >
        {children}
    </button>
);

function Row({ label, value }) {
    return (
        <div className="flex justify-between gap-4 border-b border-ink/5 py-2.5 text-sm last:border-0">
            <span className="text-ink/50">{label}</span>
            <span className="text-right font-bold">{value || <span className="font-normal text-ink/35">Not set</span>}</span>
        </div>
    );
}

function ProfileSummary({ profile, onSaved }) {
    const toast = useToast();
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const pickPhoto = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!AVATAR_TYPES.includes(file.type)) return toast.error('Photo must be JPG, PNG or WebP.');
        if (file.size > 1024 * 1024) return toast.error('Photo must be 1 MB or smaller.');
        const form = new FormData();
        form.append('avatar', file);
        setBusy(true);
        try {
            onSaved(unwrap(await apiClient.uploadAvatar(form)));
            toast.success('Photo updated.');
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not upload the photo.');
        } finally {
            setBusy(false);
        }
    };
    const removePhoto = async () => {
        setBusy(true);
        try {
            onSaved(unwrap(await apiClient.deleteAvatar()));
        } catch {
            toast.error('Could not remove the photo.');
        } finally {
            setBusy(false);
        }
    };

    const initials = (profile.name || profile.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const isHost = profile.role === 'organizer';
    const since = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null;
    const sections = [['account', 'Account details', UserRound], ...(isHost ? [['bank', 'Payout bank', Landmark]] : []), ['password', 'Password', KeyRound]];

    return (
        <aside className="border border-ink/10 bg-white lg:sticky lg:top-24">
            <div className="flex items-center gap-4 p-5 lg:flex-col lg:items-start">
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    aria-label={profile.avatarUrl ? 'Change photo' : 'Add photo'}
                    className="group relative h-20 w-20 shrink-0 overflow-hidden bg-ink text-white lg:h-24 lg:w-24"
                >
                    {profile.avatarUrl
                        ? <img src={avatarSrc(profile.avatarUrl)} alt="" className="h-full w-full object-cover" />
                        : <span className="grid h-full w-full place-items-center text-2xl font-extrabold">{initials}</span>}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/75 py-1 text-[10px] font-extrabold uppercase tracking-wider opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Camera size={11} /> {busy ? '…' : 'Change'}
                    </span>
                </button>
                <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} hidden onChange={pickPhoto} />
                <div className="min-w-0">
                    <p className="truncate text-lg font-extrabold">{profile.name}</p>
                    <p className="truncate text-sm text-ink/55">{profile.email}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${isHost ? 'bg-coral/10 text-coral' : 'bg-ink/5 text-ink/60'}`}>{isHost ? 'Host' : 'Buyer'}</span>
                        {profile.hostVerified ? <span className="flex items-center gap-1 bg-sky/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky"><BadgeCheck size={11} /> Verified</span> : null}
                    </p>
                </div>
            </div>
            <div className="flex gap-2 border-t border-ink/10 px-5 py-3 text-xs">
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="font-bold text-coral hover:underline disabled:opacity-50">
                    {profile.avatarUrl ? 'Change photo' : 'Add photo'}
                </button>
                {profile.avatarUrl ? (
                    <button type="button" disabled={busy} onClick={removePhoto} className="font-bold text-ink/50 hover:text-red-600 disabled:opacity-50">Remove</button>
                ) : <span className="text-ink/40">JPG, PNG or WebP · 1 MB</span>}
            </div>
            <nav aria-label="Profile sections" className="hidden border-t border-ink/10 py-2 lg:block">
                {sections.map(([id, label, Icon]) => (
                    <a key={id} href={`#${id}`} className="flex items-center gap-3 px-5 py-2 text-sm font-bold text-ink/65 hover:bg-ink/5 hover:text-ink">
                        <Icon size={15} className="text-ink/40" /> {label}
                    </a>
                ))}
            </nav>
            {since ? <p className="border-t border-ink/10 px-5 py-3 text-xs text-ink/45">Member since {since}</p> : null}
        </aside>
    );
}

function AccountCard({ profile, onSaved }) {
    const toast = useToast();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const start = () => {
        setForm({ name: profile.name || '', phone: profile.phone || '' });
        setErrors({});
        setEditing(true);
    };
    const save = async () => {
        setBusy(true);
        try {
            onSaved(unwrap(await apiClient.updateAccountProfile({ name: form.name, phone: form.phone })));
            toast.success('Profile updated.');
            setEditing(false);
        } catch (failure) {
            setErrors(fieldErrors(failure));
            toast.error(failure.response?.data?.message || 'Could not save your profile.');
        } finally {
            setBusy(false);
        }
    };
    return (
        <Card
            id="account"
            icon={<UserRound size={18} />}
            title="Account"
            subtitle="Your name and phone appear to buyers and your team."
            action={!editing ? <SmallButton onClick={start}><Pencil size={12} /> Edit</SmallButton> : null}
        >
            {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" error={errors.name}>
                        <input className={inputCls} value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </Field>
                    <Field label="Phone" error={errors.phone}>
                        <input className={inputCls} value={form.phone} inputMode="tel" placeholder="+91 98765 43210" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </Field>
                    <Field label="Email" hint="Contact support to change your sign-in email.">
                        <input className={inputCls} value={profile.email} disabled />
                    </Field>
                    <div className="flex items-end justify-end gap-2 sm:col-span-2">
                        <SmallButton disabled={busy} onClick={() => setEditing(false)}>Cancel</SmallButton>
                        <SmallButton tone="primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</SmallButton>
                    </div>
                </div>
            ) : (
                <div>
                    <Row label="Name" value={profile.name} />
                    <Row label="Email" value={profile.email} />
                    <Row label="Phone" value={profile.phone} />
                    <Row label="Account type" value={profile.role === 'organizer' ? `Host${profile.hostVerified ? ' · verified' : ''}` : 'Buyer'} />
                </div>
            )}
        </Card>
    );
}

function PasswordCard() {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ current_password: '', password: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const close = () => {
        setOpen(false);
        setForm({ current_password: '', password: '', confirm: '' });
        setErrors({});
    };
    const save = async () => {
        if (form.password !== form.confirm) return setErrors({ confirm: 'Passwords don’t match' });
        setBusy(true);
        try {
            await apiClient.changePassword({ current_password: form.current_password, password: form.password });
            toast.success('Password updated.');
            close();
        } catch (failure) {
            setErrors(fieldErrors(failure));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card
            id="password"
            icon={<KeyRound size={18} />}
            title="Password"
            subtitle="At least 8 characters, with a letter and a number."
            action={!open ? <SmallButton onClick={() => setOpen(true)}><Pencil size={12} /> Change</SmallButton> : null}
        >
            {open ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Current password" error={errors.current_password}>
                        <input type="password" autoComplete="current-password" className={inputCls} value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
                    </Field>
                    <Field label="New password" error={errors.password}>
                        <input type="password" autoComplete="new-password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    </Field>
                    <Field label="Confirm new password" error={errors.confirm}>
                        <input type="password" autoComplete="new-password" className={inputCls} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
                    </Field>
                    <div className="flex justify-end gap-2 sm:col-span-3">
                        <SmallButton disabled={busy} onClick={close}>Cancel</SmallButton>
                        <SmallButton tone="primary" disabled={busy || !form.current_password || !form.password} onClick={save}>{busy ? 'Saving…' : 'Update password'}</SmallButton>
                    </div>
                </div>
            ) : <p className="text-sm text-ink/55">••••••••••</p>}
        </Card>
    );
}

function BankCard({ bank, onSaved }) {
    const toast = useToast();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(EMPTY_BANK);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const start = () => {
        setForm(bank ? { ...EMPTY_BANK, ...bank, account_number: '' } : EMPTY_BANK);
        setErrors({});
        setEditing(true);
    };
    const save = async () => {
        const payload = { ...form, account_number: form.account_number.trim() || undefined };
        delete payload.account_number_masked;
        delete payload.updated_at;
        setBusy(true);
        try {
            onSaved(unwrap(await apiClient.updatePayoutBank(payload)));
            toast.success('Bank account saved.');
            setEditing(false);
        } catch (failure) {
            setErrors(fieldErrors(failure));
            toast.error(failure.response?.data?.message || 'Could not save the bank account.');
        } finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!window.confirm('Remove this bank account? Payouts will wait until you add one again.')) return;
        setBusy(true);
        try {
            await apiClient.deletePayoutBank();
            onSaved(null);
            toast.success('Bank account removed.');
        } catch {
            toast.error('Could not remove the bank account.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card
            id="bank"
            icon={<Landmark size={18} />}
            title="Payout bank account"
            subtitle="Where we send your ticket earnings from online sales."
            action={!editing && bank ? <SmallButton onClick={start}><Pencil size={12} /> Edit</SmallButton> : null}
        >
            {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name on account" error={errors.account_holder_name}>
                        <input className={inputCls} value={form.account_holder_name} onChange={set('account_holder_name')} />
                    </Field>
                    <Field label="Bank name" error={errors.bank_name}>
                        <input className={inputCls} value={form.bank_name} placeholder="HDFC Bank" onChange={set('bank_name')} />
                    </Field>
                    <Field
                        label="Account number"
                        error={errors.account_number}
                        hint={bank ? `Saved: ${bank.account_number_masked}. Leave blank to keep it.` : null}
                    >
                        <input className={inputCls} value={form.account_number} inputMode="numeric" autoComplete="off" onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })} />
                    </Field>
                    <Field label="IFSC code" error={errors.ifsc}>
                        <input className={`${inputCls} uppercase`} value={form.ifsc} maxLength={11} placeholder="HDFC0001234" onChange={set('ifsc')} />
                    </Field>
                    <Field label="Account type" error={errors.account_type}>
                        <select className={inputCls} value={form.account_type} onChange={set('account_type')}>
                            <option value="savings">Savings</option>
                            <option value="current">Current</option>
                        </select>
                    </Field>
                    <Field label="Branch (optional)" error={errors.branch}>
                        <input className={inputCls} value={form.branch} onChange={set('branch')} />
                    </Field>
                    <Field label="UPI ID (optional)" error={errors.upi_id}>
                        <input className={inputCls} value={form.upi_id} placeholder="name@okhdfc" onChange={set('upi_id')} />
                    </Field>
                    <div className="flex items-end justify-end gap-2">
                        <SmallButton disabled={busy} onClick={() => setEditing(false)}>Cancel</SmallButton>
                        <SmallButton tone="primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save bank account'}</SmallButton>
                    </div>
                </div>
            ) : bank ? (
                <>
                    <Row label="Name on account" value={bank.account_holder_name} />
                    <Row label="Bank" value={[bank.bank_name, bank.branch].filter(Boolean).join(' · ')} />
                    <Row label="Account number" value={<span className="font-mono">{bank.account_number_masked}</span>} />
                    <Row label="IFSC" value={<span className="font-mono">{bank.ifsc}</span>} />
                    <Row label="Account type" value={bank.account_type === 'current' ? 'Current' : 'Savings'} />
                    <Row label="UPI ID" value={bank.upi_id} />
                    <div className="mt-4 flex justify-end">
                        <SmallButton tone="danger" disabled={busy} onClick={remove}><Trash2 size={12} /> Remove</SmallButton>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-start gap-3 border border-dashed border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-amber-900">
                        <span className="block font-bold">No bank account yet</span>
                        Add one so we can pay out your online ticket sales.
                    </p>
                    <SmallButton tone="primary" onClick={start}><Landmark size={12} /> Add bank account</SmallButton>
                </div>
            )}
        </Card>
    );
}

export default function Profile() {
    const dispatch = useDispatch();
    const toast = useToast();
    const sessionUser = useSelector((s) => s.auth.user);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        apiClient.accountProfile()
            .then((res) => setProfile(unwrap(res, null)))
            .catch(() => toast.error('Could not load your profile.'));
    }, []);

    const applyProfile = (next) => {
        setProfile(next);
        // Keep the header (name, photo) in sync without a reload.
        dispatch(setUser({ user: { ...sessionUser, name: next.name, username: next.name, avatarUrl: next.avatarUrl } }));
    };

    return (
        <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
            <div className="border-b border-ink/10 pb-5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Settings</p>
                <h1 className="serif mt-1 text-4xl sm:text-5xl">Your profile</h1>
                <p className="mt-2 text-sm text-ink/55">Manage your details{profile?.role === 'organizer' ? ', payout bank' : ''} and password.</p>
            </div>
            {!profile ? (
                <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
                    <div className="h-72 animate-pulse bg-ink/5" />
                    <div className="space-y-5">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse bg-ink/5" />)}</div>
                </div>
            ) : (
                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[280px_1fr]">
                    <ProfileSummary profile={profile} onSaved={applyProfile} />
                    <div className="min-w-0 space-y-5">
                        <AccountCard profile={profile} onSaved={applyProfile} />
                        {profile.role === 'organizer' ? (
                            <BankCard bank={profile.payoutBank} onSaved={(bank) => setProfile((p) => ({ ...p, payoutBank: bank }))} />
                        ) : null}
                        <PasswordCard />
                    </div>
                </div>
            )}
        </main>
    );
}
