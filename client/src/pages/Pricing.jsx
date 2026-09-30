import { useEffect, useMemo, useState } from 'react';
import {
    BarChart3, Banknote, ChevronDown, CreditCard, QrCode, Ticket, Users
} from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrapList } from '../lib/unwrap.js';
import OrganizerPage, { SectionHead } from '../components/marketing/OrganizerPage.jsx';

const FEATURES = [
    { icon: Ticket, title: 'Selling', items: ['As many events and ticket types as you like', 'Online payments with UPI and cards', 'Cash sales by you and your team', 'Discount codes'] },
    { icon: Users, title: 'Your team', items: ['Co-organizers, promoters, partner shops and door staff', 'Each person sees only their own job', 'Every sale credited to the person who made it'] },
    { icon: QrCode, title: 'At the door', items: ['A unique QR code on every ticket', 'Codes work once — repeats are refused', 'Phone and paper tickets scan the same way'] },
    { icon: BarChart3, title: 'Money & reports', items: ['Live sales and check-in numbers', 'Earnings paid to your bank account', 'Cash totals ready for settlement'] }
];

const FAQS = [
    ['Is there a monthly charge?', 'No. Creating an account and listing events is free. A fee is only taken when a paid ticket sells.'],
    ['Do free events cost anything?', 'No. Free tickets carry no fees at all.'],
    ['Who pays the fee — me or my buyers?', 'The fee comes out of the ticket price, so buyers pay exactly the price you set.'],
    ['How are cash sales handled?', 'The cash stays with you and your team. MXO adds up the service fee on those sales per event, and you settle it from your Settlements page.'],
    ['When do I get my online earnings?', 'Online earnings, minus fees, are paid to the bank account you add in your Profile.'],
    ['Can the fees change?', 'Current fees are always shown on this page. The calculator above uses the live rates.']
];

const fmt = (n) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const rate = (pct, flat) => [pct ? `${pct}%` : null, flat ? `₹${flat}` : null].filter(Boolean).join(' + ') || 'Free';

function Line({ label, value, note, strong }) {
    return (
        <div className={`flex items-baseline justify-between gap-4 py-2.5 ${strong ? 'border-t border-ink/15 pt-4' : ''}`}>
            <span className={strong ? 'font-extrabold' : 'text-ink/60'}>
                {label}{note ? <span className="ml-1 text-xs text-ink/40">({note})</span> : null}
            </span>
            <span className={`tabular-nums ${strong ? 'serif text-3xl' : 'font-bold'}`}>{value}</span>
        </div>
    );
}

function Calculator({ fees }) {
    const [price, setPrice] = useState(500);
    const service = price > 0 ? (price * fees.servicePct) / 100 + fees.serviceFlat : 0;
    const processing = price > 0 ? (price * fees.paymentPct) / 100 + fees.paymentFlat : 0;
    const online = Math.max(0, price - service - processing);
    const cash = Math.max(0, price - service);

    return (
        <div className="grid border border-ink/10 bg-white lg:grid-cols-[1fr_1.1fr]">
            <div className="border-b border-ink/10 p-6 lg:border-b-0 lg:border-r">
                <label htmlFor="ticket-price" className="text-[11px] font-extrabold uppercase tracking-[.16em] text-ink/50">Ticket price</label>
                <div className="mt-2 flex items-center border border-ink/15 focus-within:border-coral">
                    <span className="px-3 font-bold text-ink/50">₹</span>
                    <input
                        id="ticket-price"
                        type="number"
                        min={0}
                        max={100000}
                        value={price}
                        onChange={(e) => setPrice(Math.max(0, Math.min(100000, Number(e.target.value) || 0)))}
                        className="w-full py-3 pr-3 text-2xl font-extrabold outline-none"
                    />
                </div>
                <input
                    type="range"
                    min={0}
                    max={10000}
                    step={50}
                    value={Math.min(price, 10000)}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    aria-label="Ticket price slider"
                    className="mt-5 w-full accent-coral"
                />
                <div className="mt-6 space-y-3 text-sm">
                    <p className="flex justify-between"><span className="text-ink/60">MXO service fee</span><span className="font-bold">{rate(fees.servicePct, fees.serviceFlat)}</span></p>
                    <p className="flex justify-between"><span className="text-ink/60">Online payment processing</span><span className="font-bold">{rate(fees.paymentPct, fees.paymentFlat)}</span></p>
                    <p className="flex justify-between"><span className="text-ink/60">Free tickets</span><span className="font-bold">No fees</span></p>
                </div>
            </div>
            <div className="grid sm:grid-cols-2">
                <div className="border-b border-ink/10 p-6 sm:border-b-0 sm:border-r">
                    <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-coral"><CreditCard size={14} /> Sold online</p>
                    <div className="mt-3 text-sm">
                        <Line label="Ticket price" value={`₹${fmt(price)}`} />
                        <Line label="Service fee" value={`−₹${fmt(service)}`} />
                        <Line label="Processing" value={`−₹${fmt(processing)}`} />
                        <Line label="You earn" value={`₹${fmt(online)}`} strong />
                    </div>
                </div>
                <div className="p-6">
                    <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-coral"><Banknote size={14} /> Sold for cash</p>
                    <div className="mt-3 text-sm">
                        <Line label="Ticket price" value={`₹${fmt(price)}`} />
                        <Line label="Service fee" value={`−₹${fmt(service)}`} note="settled later" />
                        <Line label="Processing" value="₹0.00" />
                        <Line label="You earn" value={`₹${fmt(cash)}`} strong />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Pricing() {
    const [fees, setFees] = useState(null);
    const [failed, setFailed] = useState(false);
    const [openFaq, setOpenFaq] = useState(0);

    useEffect(() => {
        apiClient.countries()
            .then((res) => {
                const rows = unwrapList(res);
                const row = rows.find((r) => /india/i.test(r.country)) || rows[0];
                if (!row) throw new Error('No fee settings');
                setFees({
                    servicePct: Number(row.serviceFeePercent) || 0,
                    serviceFlat: Number(row.serviceFeeFlat) || 0,
                    paymentPct: Number(row.paymentFeePercent) || 0,
                    paymentFlat: Number(row.paymentFeeFlat) || 0
                });
            })
            .catch(() => setFailed(true));
    }, []);

    const headline = useMemo(() => (fees ? rate(fees.servicePct, fees.serviceFlat) : null), [fees]);

    return (
        <OrganizerPage
            eyebrow="Pricing"
            title="Free to list. Pay only when you sell."
            lead="No monthly plans and no setup cost. A small fee applies to each paid ticket — free tickets are always free."
            aside={(
                <div className="border border-ink/10 bg-cream p-8 text-center">
                    <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-ink/50">Service fee per paid ticket</p>
                    <p className="serif mt-3 text-6xl">{headline || (failed ? '—' : '…')}</p>
                    <p className="mt-3 text-sm text-ink/55">plus online payment processing on card and UPI sales</p>
                </div>
            )}
        >
            <section className="space-y-8">
                <SectionHead eyebrow="Fee calculator" title="See what you take home" text="Enter a ticket price to see the fees and your earnings for online and cash sales." />
                {fees ? <Calculator fees={fees} />
                    : failed ? <p className="border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800">Current fees couldn’t be loaded. Please refresh, or contact us for pricing.</p>
                        : <div className="h-72 animate-pulse bg-ink/5" />}
            </section>

            <section className="space-y-8">
                <SectionHead eyebrow="No plans, no tiers" title="Every event gets everything" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map(({ icon: Icon, title, items }) => (
                        <article key={title} className="border border-ink/10 bg-white p-6">
                            <Icon size={20} className="text-coral" />
                            <h3 className="mt-3 font-extrabold">{title}</h3>
                            <ul className="mt-3 space-y-1.5 text-sm text-ink/60">
                                {items.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>

            <section className="space-y-6">
                <SectionHead eyebrow="Fee questions" title="Straight answers" />
                <div className="divide-y divide-ink/10 border-y border-ink/10">
                    {FAQS.map(([q, a], i) => (
                        <div key={q}>
                            <button
                                type="button"
                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                aria-expanded={openFaq === i}
                                className="flex w-full items-center justify-between gap-4 py-4 text-left font-extrabold"
                            >
                                {q}
                                <ChevronDown size={18} className={`shrink-0 transition ${openFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq === i ? <p className="pb-5 text-ink/60">{a}</p> : null}
                        </div>
                    ))}
                </div>
            </section>
        </OrganizerPage>
    );
}
