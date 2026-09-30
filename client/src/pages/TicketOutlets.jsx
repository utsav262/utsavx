import { Link } from 'react-router-dom';
import { Bell, Check, Landmark, PackagePlus, Printer, Store, Ticket, Truck, Wallet, X, Zap } from 'lucide-react';
import OrganizerPage, { FeatureCard, SectionHead } from '../components/marketing/OrganizerPage.jsx';

const STEPS = [
    { icon: PackagePlus, title: 'Invite the outlet & assign tickets', text: 'Invite a shop owner to your event as a Ticket Outlet and allocate exactly which ticket types, and how many, they can sell.' },
    { icon: Wallet, title: 'Buyer pays cash', text: 'Attendees walk in and pay cash at the counter, just as they’re used to.' },
    { icon: Zap, title: 'Instant digital ticket', text: 'The outlet issues the ticket from their phone and the buyer gets a unique QR ticket straight away.' }
];

const OLD_WAY = [
    ['High printing costs & delays', 'Paying printers upfront and waiting days for batches.'],
    ['Manual drop-offs & restocking', 'Driving across town to deliver or top up paper tickets.'],
    ['Blind spots in sales', 'No live numbers until you call or visit each shop.'],
    ['Cash collection risks', 'Chasing and carrying cash from different outlets.']
];

const NEW_WAY = [
    ['Zero printing', 'Tickets are generated digitally the moment they’re sold.'],
    ['Instant remote allocation', 'Add an outlet or change its allocation from your dashboard.'],
    ['Live sales tracking', 'See every outlet sale in your dashboard, attributed to that outlet.'],
    ['Clear cash settlement', 'Cash sales are totalled per event so settling up is simple.']
];

function OutletMock() {
    return (
        <div className="border border-ink/10 bg-cream p-5">
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <span className="flex items-center gap-2 text-sm font-extrabold"><Store size={16} className="text-coral" /> Sharma General Store</span>
                <span className="bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Outlet</span>
            </div>
            {[['General admission', 40, 26], ['VIP', 10, 4]].map(([name, total, sold]) => (
                <div key={name} className="mt-4">
                    <div className="flex justify-between text-xs"><span className="font-bold">{name}</span><span className="text-ink/55">{sold} of {total} sold</span></div>
                    <div className="mt-1.5 h-1.5 bg-ink/10"><div className="h-full bg-coral" style={{ width: `${(sold / total) * 100}%` }} /></div>
                </div>
            ))}
            <p className="mt-5 text-center text-[11px] text-ink/45">Example allocation</p>
        </div>
    );
}

export default function TicketOutlets() {
    return (
        <OrganizerPage
            eyebrow="Ticket outlets"
            title="Add outlets in seconds. Sell tickets in minutes."
            lead="Forget printing tickets and dropping them off. Put your tickets in local shops with a few clicks and watch outlet sales live."
            aside={<OutletMock />}
            closing={{ title: 'Bring your tickets to the neighbourhood.', text: 'Invite your first outlet from your event’s Team tab.' }}
        >
            <section className="space-y-8">
                <SectionHead eyebrow="How it works" title="Three steps, no paper" />
                <ol className="grid gap-4 md:grid-cols-3">
                    {STEPS.map(({ icon: Icon, title, text }, i) => (
                        <li key={title} className="border border-ink/10 bg-white p-6">
                            <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-coral">Step {i + 1}</p>
                            <Icon size={22} className="mt-4" />
                            <h3 className="mt-3 font-extrabold">{title}</h3>
                            <p className="mt-2 text-sm text-ink/60">{text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="space-y-8">
                <SectionHead eyebrow="Why switch" title="Paper tickets vs. MXO outlets" />
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="border border-ink/10 bg-white p-6">
                        <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ink/50"><Printer size={16} /> Traditional paper tickets</p>
                        <ul className="mt-5 space-y-4">
                            {OLD_WAY.map(([title, text]) => (
                                <li key={title} className="flex gap-3">
                                    <X size={18} className="mt-0.5 shrink-0 text-red-500" />
                                    <span><span className="block font-bold">{title}</span><span className="text-sm text-ink/55">{text}</span></span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="border-2 border-coral bg-white p-6">
                        <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-coral"><Ticket size={16} /> MXO digital outlets</p>
                        <ul className="mt-5 space-y-4">
                            {NEW_WAY.map(([title, text]) => (
                                <li key={title} className="flex gap-3">
                                    <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                                    <span><span className="block font-bold">{title}</span><span className="text-sm text-ink/55">{text}</span></span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <FeatureCard icon={Truck} title="No more drop-offs">Allocations are digital, so restocking a busy outlet takes seconds, not a drive.</FeatureCard>
                <FeatureCard icon={Bell} title="Always in the loop">Outlet sales show up in your event dashboard as they happen.</FeatureCard>
                <FeatureCard icon={Landmark} title="Simple settlement">Cash sales are totalled per event and settled through the Settlements page.</FeatureCard>
            </section>

            <p className="text-center text-sm text-ink/55">
                Run a shop and want to sell tickets? <Link to="/contact" className="font-bold text-coral hover:underline">Contact us</Link> and we’ll connect you with local hosts.
            </p>
        </OrganizerPage>
    );
}
