import { UtensilsCrossed } from 'lucide-react';
import { money } from '../../lib/money.js';
import { formatLocalInput, isoToZonedLocal } from '../manager/create/eventForm.js';
import { feePreview, isNonComplimentary, peopleCapacity, toAdmits } from './ticketUtils.js';

const input =
    'w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-base outline-none transition placeholder:text-ink/35 focus:border-coral';
const label = 'block text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/45';

/** Pinned action bar so the primary button is always reachable on long forms. */
export function StickyActions({ children }) {
    return (
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
            {children}
        </div>
    );
}

export default function PaidTicketScreen({ draft, setDraft, onBack, onContinue, error, context = {}, tickets = [], feePercent }) {
    const fees = feePreview(draft, feePercent);
    const isPaid = draft.ticketType !== 'free';
    const admits = toAdmits(draft.admits);
    const quantity = Math.floor(Number(draft.quantity) || 0);
    const zone = context.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const maxSaleEnd = context.eventEnd ? isoToZonedLocal(context.eventEnd, zone) : undefined;
    const regWindow = [
        context.registrationOpens && `opens ${formatLocalInput(isoToZonedLocal(context.registrationOpens, zone))}`,
        context.registrationCloses && `closes ${formatLocalInput(isoToZonedLocal(context.registrationCloses, zone))}`,
    ].filter(Boolean).join(', ');

    // People already allotted to the other tiers, for the max-participants cap.
    const others = tickets.filter((t) => String(t._id) !== String(draft._id) && isNonComplimentary(t));
    const othersPeople = others.reduce((sum, t) => sum + (peopleCapacity(t) || 0), 0);
    const thisPeople = peopleCapacity(draft);
    const remaining = context.maxPeople != null ? Math.max(0, context.maxPeople - othersPeople) : null;

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
                {context.mode === 'free' && (
                    <p className="mt-2 text-sm text-ink/55">This event uses free registration — free passes are enough; paid tiers are optional.</p>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <label className={label}>Name</label>
                    <input
                        className={input}
                        value={draft.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder={context.mode === 'free' ? 'Participant pass' : 'General Admission'}
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
                                aria-pressed={draft.ticketType === row.id}
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
                        <label className={label}>Quantity {context.maxPeople != null ? '' : '(0 = unlimited)'}</label>
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

                <div>
                    <label className={label}>People per ticket</label>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        className={input}
                        value={draft.admits}
                        onChange={(e) => patch({ admits: e.target.value })}
                    />
                    <p className="mt-2 text-sm text-ink/55">
                        Keep 1 for normal tickets. For a group pass, such as Student + 2 Parents, enter 3:
                        one QR lets all of them in together with a single scan.
                    </p>
                    <p className="mt-2 text-sm font-bold text-ink/70">
                        {quantity > 0
                            ? `${quantity} tickets × ${admits} ${admits === 1 ? 'person' : 'people'} = ${thisPeople} people`
                            : 'Unlimited tickets'}
                        {remaining != null ? ` · ${remaining} of ${context.maxPeople} participant places left for this tier` : ''}
                    </p>
                </div>

                <label className="flex cursor-pointer items-start gap-3 border border-ink/15 bg-white p-4 transition hover:border-coral">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-coral"
                        checked={Boolean(draft.includesLunch)}
                        onChange={(e) => patch({ includesLunch: e.target.checked })}
                    />
                    <span>
                        <span className="flex items-center gap-2 text-sm font-bold">
                            <UtensilsCrossed size={14} className="text-coral" /> Includes lunch
                        </span>
                        <span className="mt-1 block text-xs text-ink/55">
                            After entry, staff scan the same QR at the lunch counter — once per ticket, for everyone on it who came in.
                        </span>
                    </span>
                </label>

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

                <div>
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <label className={label}>Sale start (optional)</label>
                            <input
                                type="datetime-local"
                                className={input}
                                max={maxSaleEnd}
                                value={draft.saleStartsAt}
                                onChange={(e) => patch({ saleStartsAt: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={label}>Sale end (optional)</label>
                            <input
                                type="datetime-local"
                                className={input}
                                min={draft.saleStartsAt || undefined}
                                max={maxSaleEnd}
                                value={draft.saleEndsAt}
                                onChange={(e) => patch({ saleEndsAt: e.target.value })}
                            />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-ink/50">
                        Times in {zone}. Online sales also need registration to be open{regWindow ? ` (${regWindow})` : ''}; gate sales ignore these windows.
                    </p>
                </div>

                {isPaid ? (
                    <div className="space-y-2 border border-ink/10 bg-cream p-4 text-sm">
                        <p className={label}>What you earn</p>
                        <Row label="Buyer pays at checkout" value={money(fees.buyerPays)} />
                        <Row label={`Platform fee (${fees.feePercent}%)`} value={`− ${money(fees.fee)}`} />
                        <Row label="You receive per ticket" value={money(fees.hostReceives)} strong />
                        {fees.tierHostReceives != null && (
                            <Row label={`If all ${quantity} sell`} value={`${money(fees.tierGross)} gross · ${money(fees.tierHostReceives)} to you`} />
                        )}
                        {fees.door > 0 && (
                            <Row label="At the gate (cash)" value={`Buyer pays ${money(fees.door)} · you remit ${money(fees.doorFee)}`} />
                        )}
                    </div>
                ) : null}

                {error ? <p role="alert" className="text-sm text-coral">{error}</p> : null}
            </div>

            <StickyActions>
                <button
                    type="button"
                    onClick={onContinue}
                    className="w-full bg-ink px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white"
                >
                    Continue
                </button>
            </StickyActions>
        </section>
    );
}

function Row({ label: text, value, strong }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-ink/60">{text}</span>
            <span className={`text-right ${strong ? 'font-extrabold text-ink' : 'font-bold text-ink/75'}`}>{value}</span>
        </div>
    );
}
