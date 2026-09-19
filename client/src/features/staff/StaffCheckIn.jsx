import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { eventCover, eventIdOf, EventMeta, roleLabel, SectionHeader } from './staffHelpers.jsx';

function normalizeScanCode(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (value.startsWith('{')) {
        try {
            const parsed = JSON.parse(value);
            return String(parsed.confirmationCode || parsed.confirmation_id || parsed.code || value).trim();
        } catch {
            return value;
        }
    }
    return value;
}

function describeScanError(data = {}) {
    const status = data.ticket_status || data.status;
    if (status === 'invalid') {
        return {
            title: 'Invalid ticket',
            body: 'This confirmation code was not found for this event. Check the QR or ask the guest for another pass.'
        };
    }
    if (status === 'already_claimed') {
        return {
            title: 'Already checked in',
            body: 'This ticket was already claimed. Entry may have been used earlier.'
        };
    }
    if (status === 'payment_not_done') {
        return {
            title: 'Ticket not valid',
            body: 'Payment is incomplete or the ticket is not valid for entry yet.'
        };
    }
    return {
        title: 'Scan failed',
        body: data.message || 'Could not validate this ticket.'
    };
}

export default function StaffCheckIn({ invite, onNotice, onBack }) {
    const toast = useToast();
    const [code, setCode] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [busy, setBusy] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const event = invite?.event || {};
    const eventId = eventIdOf(invite);

    const scan = async (action) => {
        const normalized = normalizeScanCode(code);
        setFieldError('');
        setLastResult(null);

        if (!eventId) {
            setFieldError('Select an accepted event before scanning.');
            return;
        }
        if (!normalized) {
            setFieldError('Enter or scan a confirmation code.');
            return;
        }

        setBusy(true);
        try {
            const response = await apiClient.staffScanTicket({
                event_id: eventId,
                code: normalized,
                action
            });
            const message = response.data.message || (action === 'scan' ? 'Ticket scanned successfully.' : 'Ticket is valid.');
            const detail = response.data.result || {};
            setLastResult({
                ok: true,
                title: action === 'scan' ? 'Checked in' : 'Valid ticket',
                message,
                detail,
                action
            });
            toast.success(message);
            onNotice?.('');
            if (action === 'scan') setCode('');
        } catch (error) {
            const data = error.response?.data || {};
            const described = describeScanError(data);
            setLastResult({
                ok: false,
                title: described.title,
                message: described.body,
                detail: data.result || {},
                status: data.ticket_status || data.status,
                action
            });
            setFieldError(described.title);
            onNotice?.('');
        } finally {
            setBusy(false);
        }
    };

    if (!invite) {
        return (
            <section>
                <SectionHeader
                    eyebrow="Door"
                    title="Check-in"
                    subtitle="Open an accepted event first, then scan guest confirmation codes."
                />
                <div className="mt-8 border border-dashed border-ink/20 bg-white/60 px-6 py-14 text-center">
                    <p className="serif text-2xl">No event selected</p>
                    <p className="mx-auto mt-3 max-w-md text-sm text-ink/55">
                        Accept an invite, then open check-in from My events.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section>
            <SectionHeader
                eyebrow="Door"
                title="Check-in"
                subtitle="Validate or claim tickets for this event. Paste a QR payload or confirmation code."
                action={
                    onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="border border-ink/20 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider"
                        >
                            Back to events
                        </button>
                    ) : null
                }
            />

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <article className="overflow-hidden border border-ink/15 bg-white">
                    <div className="aspect-[16/10] bg-moss">
                        <img src={eventCover(event)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="p-6">
                        <span className="bg-moss/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-moss">
                            {roleLabel(invite.userType)}
                        </span>
                        <h3 className="serif mt-3 text-3xl leading-none">{event.title || 'Event'}</h3>
                        <EventMeta event={event} className="mt-4" />
                    </div>
                </article>

                <div className="border border-ink/15 bg-white p-6 sm:p-8">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Scan ticket</p>
                    <h3 className="serif mt-3 text-3xl">Confirmation code</h3>
                    <p className="mt-2 text-sm text-ink/55">
                        Use Validate to preview, or Claim to check the guest in.
                    </p>

                    <label className="mt-8 block">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Code</span>
                        <input
                            className={`mt-2 w-full border bg-transparent px-4 py-4 text-sm outline-none ${
                                fieldError || (lastResult && !lastResult.ok)
                                    ? 'border-coral focus:border-coral'
                                    : 'border-ink/15 focus:border-ink/40'
                            }`}
                            placeholder="Scan or paste confirmation code"
                            value={code}
                            disabled={busy}
                            autoFocus
                            aria-invalid={Boolean(fieldError)}
                            onChange={(e) => {
                                setCode(e.target.value);
                                if (fieldError) setFieldError('');
                                if (lastResult && !lastResult.ok) setLastResult(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') scan('scan');
                            }}
                        />
                    </label>
                    {fieldError ? (
                        <p className="mt-2 flex items-center gap-2 text-sm text-coral">
                            <AlertTriangle size={14} />
                            {fieldError}
                        </p>
                    ) : null}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => scan('validate')}
                            className="inline-flex items-center justify-center gap-2 border border-ink/20 px-4 py-3.5 text-xs font-extrabold uppercase tracking-wider disabled:opacity-60"
                        >
                            <ScanLine size={16} /> {busy ? 'Checking…' : 'Validate'}
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => scan('scan')}
                            className="inline-flex items-center justify-center gap-2 bg-coral px-4 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                        >
                            <Check size={16} /> {busy ? 'Claiming…' : 'Claim entry'}
                        </button>
                    </div>

                    {lastResult ? (
                        <div
                            className={`mt-6 border px-4 py-4 ${
                                lastResult.ok
                                    ? 'border-moss/25 bg-moss/10'
                                    : 'border-coral/25 bg-coral/10'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {lastResult.ok ? (
                                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-moss" />
                                ) : (
                                    <XCircle size={20} className="mt-0.5 shrink-0 text-coral" />
                                )}
                                <div>
                                    <p className={`font-extrabold uppercase tracking-wider text-xs ${lastResult.ok ? 'text-moss' : 'text-coral'}`}>
                                        {lastResult.title}
                                    </p>
                                    <p className={`mt-2 text-sm ${lastResult.ok ? 'text-moss' : 'text-coral'}`}>
                                        {lastResult.message}
                                    </p>
                                    {lastResult.detail?.confirmation_id ? (
                                        <p className="mt-2 font-mono text-xs opacity-80">
                                            Code · {lastResult.detail.confirmation_id}
                                        </p>
                                    ) : null}
                                    {lastResult.detail?.ticket_type ? (
                                        <p className="mt-1 text-xs opacity-80">
                                            Type · {lastResult.detail.ticket_type}
                                        </p>
                                    ) : null}
                                    {lastResult.status ? (
                                        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-70">
                                            Status · {String(lastResult.status).replaceAll('_', ' ')}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
