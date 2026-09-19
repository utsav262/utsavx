import { money } from '../../lib/money.js';
import { feePreview, formatQty, formatTicketPrice } from './ticketUtils.js';

export default function TicketSummaryScreen({ draft, onBack, onSave, busy, error }) {
    const fees = feePreview(draft);
    const isPaid = draft.ticketType !== 'free';

    const rows = [
        { label: 'Name', value: draft.name },
        { label: 'Type', value: isPaid ? 'Paid' : 'Free' },
        { label: 'Price', value: formatTicketPrice(draft) },
        { label: 'Quantity', value: formatQty(draft.quantity) },
        {
            label: 'Door price',
            value: draft.doorPrice !== '' && draft.doorPrice != null
                ? money(draft.doorPrice)
                : '—'
        },
        {
            label: 'Sale window',
            value: draft.saleStartsAt || draft.saleEndsAt
                ? `${draft.saleStartsAt || '…'} → ${draft.saleEndsAt || '…'}`
                : 'Open'
        }
    ];

    if (draft.description && !draft.hideDescription) {
        rows.splice(1, 0, { label: 'Description', value: draft.description });
    }

    return (
        <section className="space-y-6">
            <div>
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50"
                >
                    ← Edit details
                </button>
                <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Summary</p>
                <h2 className="serif mt-2 text-4xl">Review ticket</h2>
                <p className="mt-2 text-sm text-ink/55">Confirm and save this tier to the event.</p>
            </div>

            <dl className="divide-y divide-ink/10 border-y border-ink/10">
                {rows.map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 py-3 text-sm">
                        <dt className="text-ink/45">{row.label}</dt>
                        <dd className="max-w-[60%] text-right font-medium">{row.value}</dd>
                    </div>
                ))}
                {isPaid ? (
                    <div className="flex justify-between gap-4 py-3 text-sm">
                        <dt className="text-ink/45">You receive</dt>
                        <dd className="font-bold">{money(fees.hostReceives)}</dd>
                    </div>
                ) : null}
            </dl>

            {error ? <p className="text-sm text-coral">{error}</p> : null}

            <button
                type="button"
                disabled={busy}
                onClick={onSave}
                className="w-full bg-coral px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
            >
                {busy ? 'Saving…' : draft._id ? 'Update ticket' : 'Save ticket'}
            </button>
        </section>
    );
}
