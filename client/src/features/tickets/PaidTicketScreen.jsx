import { money } from '../../lib/money.js';
import { feePreview } from './ticketUtils.js';

const input =
    'w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-base outline-none transition placeholder:text-ink/35 focus:border-coral';
const label = 'block text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45';

export default function PaidTicketScreen({ draft, setDraft, onBack, onContinue, error }) {
    const fees = feePreview(draft);
    const isPaid = draft.ticketType !== 'free';

    const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }));

    return (
        <section className="space-y-6">
            <div>
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50"
                >
                    ← Tickets
                </button>
                <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">
                    {draft._id ? 'Edit ticket' : 'New ticket'}
                </p>
                <h2 className="serif mt-2 text-4xl">Ticket details</h2>
            </div>

            <div className="space-y-6">
                <div>
                    <label className={label}>Name</label>
                    <input
                        className={input}
                        value={draft.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder="General Admission"
                    />
                </div>

                <div>
                    <label className={label}>Description (optional)</label>
                    <textarea
                        rows={3}
                        className={`${input} resize-none leading-6`}
                        value={draft.description}
                        onChange={(e) => patch({ description: e.target.value })}
                        placeholder="What’s included…"
                    />
                    <label className="mt-3 flex items-center gap-2 text-sm text-ink/60">
                        <input
                            type="checkbox"
                            checked={draft.hideDescription}
                            onChange={(e) => patch({ hideDescription: e.target.checked })}
                        />
                        Hide description on public page
                    </label>
                </div>

                <div>
                    <p className={label}>Type</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                            { id: 'paid', label: 'Paid' },
                            { id: 'free', label: 'Free' }
                        ].map((row) => (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() =>
                                    patch({
                                        ticketType: row.id,
                                        price: row.id === 'free' ? '0' : draft.price === '0' ? '499' : draft.price
                                    })
                                }
                                className={`border px-4 py-3 text-sm font-bold ${
                                    draft.ticketType === row.id
                                        ? 'border-coral bg-coral/10 text-coral'
                                        : 'border-ink/15'
                                }`}
                            >
                                {row.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label className={label}>Quantity (0 = unlimited)</label>
                        <input
                            type="number"
                            min="0"
                            className={input}
                            value={draft.quantity}
                            onChange={(e) => patch({ quantity: e.target.value })}
                        />
                    </div>
                    {isPaid ? (
                        <div>
                            <label className={label}>Price</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={input}
                                value={draft.price}
                                onChange={(e) => patch({ price: e.target.value })}
                            />
                        </div>
                    ) : null}
                </div>

                {isPaid ? (
                    <div>
                        <label className={label}>Door / gate price (optional)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={input}
                            value={draft.doorPrice}
                            onChange={(e) => patch({ doorPrice: e.target.value })}
                            placeholder="Needed for gate sell"
                        />
                    </div>
                ) : null}

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label className={label}>Sale start (optional)</label>
                        <input
                            type="datetime-local"
                            className={input}
                            value={draft.saleStartsAt}
                            onChange={(e) => patch({ saleStartsAt: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={label}>Sale end (optional)</label>
                        <input
                            type="datetime-local"
                            className={input}
                            value={draft.saleEndsAt}
                            onChange={(e) => patch({ saleEndsAt: e.target.value })}
                        />
                    </div>
                </div>

                {isPaid ? (
                    <div className="space-y-3 border border-ink/10 bg-cream p-4">
                        <p className={label}>Fees</p>
                        <label className="flex items-center gap-2 text-sm text-ink/70">
                            <input
                                type="checkbox"
                                checked={draft.passServiceFeeToBuyer}
                                onChange={(e) => patch({ passServiceFeeToBuyer: e.target.checked })}
                            />
                            Pass service fee to buyer
                        </label>
                        <label className="flex items-center gap-2 text-sm text-ink/70">
                            <input
                                type="checkbox"
                                checked={draft.passPaymentFeeToBuyer}
                                onChange={(e) => patch({ passPaymentFeeToBuyer: e.target.checked })}
                            />
                            Pass payment fee to buyer
                        </label>
                        <p className="pt-2 text-sm text-ink/60">
                            Buyer pays {money(fees.buyerPays)} · You receive{' '}
                            <span className="font-bold text-ink">{money(fees.hostReceives)}</span>
                        </p>
                    </div>
                ) : null}

                {error ? <p className="text-sm text-coral">{error}</p> : null}

                <button
                    type="button"
                    onClick={onContinue}
                    className="w-full bg-ink px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white"
                >
                    Continue
                </button>
            </div>
        </section>
    );
}
