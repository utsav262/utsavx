import {
    Banknote, Bell, Globe, Landmark, QrCode, ScanLine, ShieldCheck, Smartphone, Store, Ticket, UserCog, Users
} from 'lucide-react';
import OrganizerPage, { FeatureCard, SectionHead } from '../components/marketing/OrganizerPage.jsx';

const CHANNELS = [
    { icon: Globe, title: 'Online', text: 'Your event page on MXO takes UPI and card payments. Buyers get their QR ticket the moment they pay.' },
    { icon: Smartphone, title: 'Ambassadors', text: 'Your street team sells from their phones and collects cash, only from the tickets you assign them.' },
    { icon: Store, title: 'Ticket outlets', text: 'Shops you trust sell your tickets over the counter for cash, from an allocation you control.' },
    { icon: ScanLine, title: 'At the gate', text: 'Sell walk-ups at the door, then scan everyone in from the same dashboard.' }
];

const ROLES = [
    { icon: UserCog, title: 'Event managers', text: 'Trusted co-pilots who run day-to-day operations: tickets, coupons, team and sales. Only you can edit or cancel the event itself.' },
    { icon: Users, title: 'Ambassadors', text: 'A mobile sales force. They see and sell only the ticket types and quantities you assign, and every sale is tracked to them.' },
    { icon: Store, title: 'Ticket outlets', text: 'Physical stores selling for cash from their allocation, with sales recorded against the outlet.' },
    { icon: ScanLine, title: 'Scanners', text: 'Gate staff with one job: check tickets in fast. A ticket can only be scanned once.' }
];

const STEPS = [
    ['Create your event', 'Add details, ticket types and prices, then submit it for a quick review.'],
    ['Go live', 'Once approved, your event page opens for sales and you can share its link and QR code.'],
    ['Build your team', 'Invite managers, ambassadors, outlets and scanners by email, each with their own permissions.'],
    ['Sell everywhere', 'Online, cash through your team, and at the gate — all counted in one live dashboard.'],
    ['Check guests in', 'Scan QR tickets at the entrance. Duplicates and cancelled tickets are refused.'],
    ['Get paid', 'Online earnings are paid to your bank account; cash sales settle the platform fee.']
];

function ChannelDiagram() {
    return (
        <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map(({ icon: Icon, title }) => (
                <div key={title} className="flex items-center gap-3 border border-ink/10 bg-cream p-4">
                    <Icon size={18} className="text-coral" />
                    <span className="text-sm font-extrabold">{title}</span>
                </div>
            ))}
            <div className="col-span-2 flex items-center justify-center gap-2 bg-ink p-4 text-sm font-extrabold uppercase tracking-wider text-white">
                <Ticket size={16} /> One live sales dashboard
            </div>
        </div>
    );
}

export default function HowItWorks() {
    return (
        <OrganizerPage
            eyebrow="How it works"
            title="One platform. Every sales channel."
            lead="Sell tickets online, through your team for cash, at partner shops and at the gate — and see every sale in one place."
            aside={<ChannelDiagram />}
        >
            <section className="space-y-8">
                <SectionHead eyebrow="Sales channels" title="Reach buyers wherever they are" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {CHANNELS.map((c) => <FeatureCard key={c.title} icon={c.icon} title={c.title}>{c.text}</FeatureCard>)}
                </div>
            </section>

            <section className="grid gap-10 lg:grid-cols-2">
                <SectionHead
                    eyebrow="Online"
                    title="Your event page, ready to sell"
                    text="Every approved event gets its own page with a stable link that doesn’t change when you edit the event, so shared links and printed QR codes keep working."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <FeatureCard icon={ShieldCheck} title="Secure payments">Payments run through Razorpay, and seats are held while the buyer pays, so you never oversell.</FeatureCard>
                    <FeatureCard icon={QrCode} title="Instant QR tickets">Each ticket has a unique code in the buyer’s account, ready to scan at the gate.</FeatureCard>
                </div>
            </section>

            <section className="space-y-8">
                <SectionHead
                    eyebrow="Team"
                    title="Roles that keep your money safe"
                    text="Delegate the work without handing over your finances or event settings. Everyone gets exactly the access their job needs."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    {ROLES.map((r) => <FeatureCard key={r.title} icon={r.icon} title={r.title}>{r.text}</FeatureCard>)}
                </div>
            </section>

            <section className="space-y-8">
                <SectionHead eyebrow="Step by step" title="From idea to sold out" />
                <ol className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
                    {STEPS.map(([title, text], i) => (
                        <li key={title} className="bg-white p-6">
                            <span className="serif text-4xl text-coral">{String(i + 1).padStart(2, '0')}</span>
                            <h3 className="mt-2 font-extrabold">{title}</h3>
                            <p className="mt-1 text-sm text-ink/60">{text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <FeatureCard icon={Bell} title="Live notifications">Hear about approvals, team invites, refunds and settlements as they happen.</FeatureCard>
                <FeatureCard icon={Banknote} title="Cash you can trust">Every cash sale is logged against the person who made it, so collections are easy to reconcile.</FeatureCard>
                <FeatureCard icon={Landmark} title="Payouts to your bank">Add your bank account once in your profile and earnings are paid there.</FeatureCard>
            </section>
        </OrganizerPage>
    );
}
