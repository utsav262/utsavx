import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ScanLine, XCircle } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { eventCover, eventIdOf, EventMeta, roleLabel, SectionHeader } from './staffHelpers.jsx';
import { CHECKPOINT_COPY, CheckpointPicker, describeScanError, eventHasLunch } from '../tickets/checkpoints.jsx';

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

export default function StaffCheckIn({ invite, onNotice, onBack }) {
    const toast = useToast();
    const [code, setCode] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [busy, setBusy] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const event = invite?.event || {};
    const eventId = eventIdOf(invite);
    const hasLunch = eventHasLunch(event);
    const [checkpoint, setCheckpoint] = useState('entry');
    const copy = CHECKPOINT_COPY[checkpoint];
    // The owner's dashboard isn't a team invite, so it scans through the manager endpoint
    // (which allows owners, admins and Event Managers); invited staff use the staff endpoint.
    const scanApi = invite?.asOwner ? apiClient.scanTicket : apiClient.staffScanTicket;

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
            const response = await scanApi({
                event_id: eventId,
                code: normalized,
                action,
                ...(checkpoint === 'lunch' ? { checkpoint: 'lunch' } : {})
            });
            const message = response.data.message || (action === 'scan' ? 'Ticket scanned successfully.' : 'Ticket is valid.');
            const detail = response.data.result || {};
            setLastResult({
                ok: true,
                checkpoint,
                title: action === 'scan' ? copy.done : checkpoint === 'lunch' ? 'Lunch included' : 'Valid ticket',
                message,
                detail,
                action
            });
            toast.success(message);
            onNotice?.('');
            if (action === 'scan') setCode('');
        } catch (error) {
            const data = error.response?.data || {};
            const described = describeScanError(data, checkpoint);
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
                        {checkpoint === 'lunch'
                            ? 'Scan the same ticket QR. Lunch is served once per ticket, after entry.'
                            : 'Use Validate to preview, or Claim to check the guest in.'}
                    </p>
                    {hasLunch ? (
                        <div className="mt-5">
                            <CheckpointPicker
                                value={checkpoint}
                                disabled={busy}
                                onChange={(next) => { setCheckpoint(next); setLastResult(null); setFieldError(''); }}
                            />
                        </div>
                    ) : null}

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
                            <ScanLine size={16} /> {busy ? 'Checking…' : copy.validate}
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => scan('scan')}
                            className="inline-flex items-center justify-center gap-2 bg-coral px-4 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                        >
                            <Check size={16} /> {busy ? copy.checking : copy.scan}
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
                                    {lastResult.ok && lastResult.checkpoint === 'lunch' ? (
                                        <p className="mt-2 inline-block bg-moss px-3 py-1 text-sm font-extrabold uppercase tracking-wider text-white">
                                            {lastResult.detail?.lunch_served
                                                ? `${lastResult.detail.lunch_served} lunch${lastResult.detail.lunch_served === 1 ? '' : 'es'}`
                                                : `Lunch for ${lastResult.detail?.people_entered || 1}`}
                                        </p>
                                    ) : lastResult.ok && Number(lastResult.detail?.admits) > 1 ? (
                                        <p className="mt-2 inline-block bg-moss px-3 py-1 text-sm font-extrabold uppercase tracking-wider text-white">
                                            Admit {lastResult.detail.admits} people
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
