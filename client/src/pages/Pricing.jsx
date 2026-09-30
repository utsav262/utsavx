import { useEffect, useMemo, useState } from 'react';
import {
    BarChart3, Banknote, ChevronDown, CreditCard, Headset, QrCode, ShieldCheck, Ticket, UserCheck, Users
} from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrapList } from '../lib/unwrap.js';
import OrganizerPage, { SectionHead } from '../components/marketing/OrganizerPage.jsx';

const FEATURES = [
    { icon: Ticket, title: 'Basics', items: ['Unlimited event listings', 'Unlimited ticket types per event', 'Mobile-friendly checkout', 'Sell from your phone and collect cash', 'Discount coupons'] },
    { icon: QrCode, title: 'Ticketing', items: ['Unique QR code on every ticket', 'Tickets delivered to the buyer’s account', 'Seats held during checkout — no overselling', 'Optional printed tickets'] },
    { icon: CreditCard, title: 'Payments', items: ['UPI and cards via Razorpay', 'Cash sales through your team', 'Payouts to your bank account', 'Clear cash settlements'] },
    { icon: BarChart3, title: 'Sales tracking', items: ['Live sales dashboard', 'Sales by ticket type', 'Sales by team member', 'Check-in counts'] },
    { icon: Users, title: 'Team & roles', items: ['Event managers', 'Ticket ambassadors', 'Ticket outlets', 'Gate scanners'] },
    { icon: UserCheck, title: 'Entry', items: ['QR scanning at the gate', 'Duplicate scans refused', 'Cancelled tickets refused'] },
    { icon: ShieldCheck, title: 'Security', items: ['Role-based access for every team member', 'Owner-only event edits and cancellation', 'Admin review before events go live'] },
    { icon: Headset, title: 'Support', items: ['Help centre and FAQs', 'Email support'] }
];

const FAQS = [
    ['How do I start selling tickets?', 'Create a host account, add your event with ticket types and prices, and submit it for review. Once approved, it goes live and you can sell online and through your team. Getting started is free.'],
    ['Can I sell online and for cash?', 'Yes. Buyers can pay online on your event page, and your managers, ambassadors and outlets can sell for cash from their phones.'],
    ['How do buyers get their tickets?', 'Each ticket, with its own QR code, appears in the buyer’s MXO account straight after purchase. You can resend tickets if a buyer needs them again.'],
    ['Are free events free to run?', 'Yes. Fees only apply to paid tickets — there’s no charge for free tickets.'],
    ['How do cash sales work?', 'Cash stays with you and your team. The MXO service fee on cash sales is totalled per event, and you settle it from the Settlements page.'],
    ['How do I get paid for online sales?', 'Add your bank account in your Profile. Online earnings, after fees, are paid out to that account.']
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
                    servicePct: Number(row.Online_Service_Fee_percentage) || 0,
                    serviceFlat: Number(row.Online_Service_Fee_dollar_amount) || 0,
                    paymentPct: Number(row.Online_Payment_Fee_percentage) || 0,
                    paymentFlat: Number(row.Online_Payment_Fee_dollar_amount) || 0
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
                <SectionHead eyebrow="Everything included" title="Every feature, on every event" />
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
                <SectionHead eyebrow="FAQ" title="Questions about fees" />
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
