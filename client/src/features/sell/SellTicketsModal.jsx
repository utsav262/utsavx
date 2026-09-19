import { isGateWindowOpen, gateOpensAt } from './sellUtils.js';
import { formatDateTime } from '../../lib/datetime.js';

export default function SellTicketsModal({ event, open, onClose, onSelect }) {
    if (!open || !event) return null;

    const gateOpen = isGateWindowOpen(event);
    const opens = gateOpensAt(event);

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <div className="relative w-full max-w-md border border-ink/10 bg-cream p-6 shadow-[0_20px_60px_rgba(26,26,26,0.2)]">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Sell tickets</p>
                <h2 className="serif mt-2 text-3xl leading-none">{event.title || event.name}</h2>
                <p className="mt-3 text-sm text-ink/55">Choose how you want to sell for this live event.</p>

                <div className="mt-6 space-y-3">
                    <button
                        type="button"
                        onClick={() => onSelect('digital')}
                        className="w-full border border-ink/15 bg-white px-4 py-4 text-left transition hover:border-ink/30"
                    >
                        <p className="text-sm font-extrabold uppercase tracking-wider">Digital ticket</p>
                        <p className="mt-1 text-sm text-ink/55">Normal stock · register buyer · cash confirm</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => onSelect('complimentary')}
                        className="w-full border border-ink/15 bg-white px-4 py-4 text-left transition hover:border-ink/30"
                    >
                        <p className="text-sm font-extrabold uppercase tracking-wider">Complimentary ticket</p>
                        <p className="mt-1 text-sm text-ink/55">Issue from the complimentary pool</p>
                    </button>

                    <button
                        type="button"
                        disabled={!gateOpen}
                        onClick={() => gateOpen && onSelect('gate')}
                        className={`w-full border px-4 py-4 text-left transition ${
                            gateOpen
                                ? 'border-ink/15 bg-white hover:border-ink/30'
                                : 'cursor-not-allowed border-ink/10 bg-ink/[0.03] opacity-60'
                        }`}
                    >
                        <p className="text-sm font-extrabold uppercase tracking-wider">Gate ticket</p>
                        <p className="mt-1 text-sm text-ink/55">
                            {gateOpen
                                ? 'Door sale · skip registration · sell another after'
                                : `Available from ${formatDateTime(opens) || 'event window'}`}
                        </p>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-6 w-full border border-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-wider"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
