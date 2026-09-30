import { useEffect, useState } from 'react';
import { admin as api } from '../api.js';
import { useAdminAuth } from '../AdminAuth.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { Button, Field, PageHead, Section, dateTime, errorText, inputCls } from '../components/kit.jsx';

const SOCIALS = [
    ['instagram', 'Instagram', 'https://instagram.com/utsavx'],
    ['twitter', 'X / Twitter', 'https://x.com/utsavx'],
    ['facebook', 'Facebook', 'https://facebook.com/utsavx'],
    ['youtube', 'YouTube', 'https://youtube.com/@utsavx'],
    ['linkedin', 'LinkedIn', 'https://linkedin.com/company/utsavx']
];

/** zod errors arrive as { social: [...] } or { 'social.instagram': [...] } depending on depth. */
const errorFor = (errors, key) => {
    const value = errors[key];
    return Array.isArray(value) ? value[0] : value;
};

export default function AdminSiteSettings() {
    const { admin } = useAdminAuth();
    const toast = useToast();
    const canEdit = admin.role === 'super_admin';
    const [form, setForm] = useState(null);
    const [savedAt, setSavedAt] = useState(null);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.get('/settings/site')
            .then((res) => {
                const { updated_at: updatedAt, ...rest } = res.data.result;
                setForm(rest);
                setSavedAt(updatedAt);
            })
            .catch((failure) => toast.error(errorText(failure, 'Could not load site settings.')));
    }, []);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const setSocial = (key) => (e) => setForm((f) => ({ ...f, social: { ...f.social, [key]: e.target.value } }));

    const save = async (event) => {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        try {
            const res = await api.put('/settings/site', form);
            setSavedAt(res.data.result.updated_at);
            toast.success('Saved — the footer and Contact page now show these details');
        } catch (failure) {
            setErrors(failure.response?.data?.errors || {});
            toast.error(errorText(failure, 'Could not save.'));
        } finally {
            setBusy(false);
        }
    };

    if (!form) return <div className="h-96 animate-pulse bg-ink/5 dark:bg-white/5" />;

    return (
        <form onSubmit={save} className="max-w-3xl space-y-5">
            <PageHead eyebrow="Website" title="Site settings">
                {canEdit ? <Button tone="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button> : null}
            </PageHead>
            <p className="text-sm text-ink/60 dark:text-white/60">
                Contact details shown in the website footer and on the Contact page.
                {savedAt ? ` Last saved ${dateTime(savedAt)}.` : ''}
            </p>
            {!canEdit ? (
                <p className="border-l-2 border-ink/30 bg-ink/5 px-3 py-2 text-sm dark:bg-white/5">Only super admins can change site settings.</p>
            ) : null}

            <fieldset disabled={!canEdit} className="space-y-6">
                <Section title="Contact details">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Cities / locations" error={errorFor(errors, 'locations')} hint="Shown in the footer, e.g. Mumbai · Delhi · Bengaluru">
                            <input value={form.locations} onChange={set('locations')} className={inputCls} />
                        </Field>
                        <Field label="Support email" error={errorFor(errors, 'support_email')}>
                            <input type="email" value={form.support_email} onChange={set('support_email')} className={inputCls} />
                        </Field>
                        <Field label="Support phone" error={errorFor(errors, 'support_phone')}>
                            <input value={form.support_phone} onChange={set('support_phone')} placeholder="+91 99999 99999" className={inputCls} />
                        </Field>
                        <Field label="Support hours" error={errorFor(errors, 'support_hours')} hint="Shown under the phone number on the Contact page">
                            <input value={form.support_hours} onChange={set('support_hours')} className={inputCls} />
                        </Field>
                    </div>
                    <div className="mt-4">
                        <Field label="Office address" error={errorFor(errors, 'office_address')} hint="Shown on the Contact page. Line breaks are kept.">
                            <textarea rows={3} value={form.office_address} onChange={set('office_address')} className={inputCls} />
                        </Field>
                    </div>
                </Section>

                <Section title="Social links">
                    <p className="-mt-1 mb-3 text-xs text-ink/50 dark:text-white/50">Leave a link empty to hide that icon from the footer.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {SOCIALS.map(([key, label, example]) => (
                            <Field key={key} label={label} error={errorFor(errors, `social.${key}`) || (key === 'instagram' ? errorFor(errors, 'social') : null)}>
                                <input type="url" value={form.social[key]} onChange={setSocial(key)} placeholder={example} className={inputCls} />
                            </Field>
                        ))}
                    </div>
                </Section>
            </fieldset>
        </form>
    );
}
