import { BarChart3, CalendarPlus, Megaphone, QrCode, ShieldCheck, Users, Wallet } from 'lucide-react';
import OrganizerPage, { FeatureCard, SectionHead } from '../components/marketing/OrganizerPage.jsx';

/** The host's journey, told in order — the page is built around this timeline. */
const JOURNEY = [
    {
        icon: CalendarPlus,
        when: 'Weeks before',
        title: 'Set up your event',
        text: 'Add the date, venue, photos and as many ticket types as you need — early bird, VIP, group. Our team gives it a quick check before it goes live.'
    },
    {
        icon: Megaphone,
        when: 'On-sale day',
        title: 'Open ticket sales',
        text: 'Share your event link or QR code anywhere. Fans pay with UPI or card and get their ticket in their MXO account straight away.'
    },
    {
        icon: Users,
        when: 'The build-up',
        title: 'Let your people sell too',
        text: 'Invite friends, promoters and local shops to sell for you. Each one only gets the tickets you hand them, and every sale is credited to the right person.'
    },
    {
        icon: QrCode,
        when: 'Event night',
        title: 'Scan guests in',
        text: 'Your door staff scan each ticket from a phone. A ticket works once — screenshots and repeats are turned away.'
    },
    {
        icon: Wallet,
        when: 'After the show',
        title: 'Settle up',
        text: 'See exactly what was sold, by whom and for how much. Online earnings go to your bank account; cash sales are totalled for a simple settlement.'
    }
];

const TEAM = [
    ['Co-organizers', 'Handle tickets, discount codes, team and sales alongside you. Editing or cancelling the event stays with you.'],
    ['Promoters', 'Sell from their phone and collect cash, limited to the tickets you give them.'],
    ['Partner shops', 'Sell over the counter from their own allocation of tickets.'],
    ['Door staff', 'Only check tickets in. No access to sales or money.']
];

function JourneyPreview() {
    return (
        <ol className="space-y-2">
            {JOURNEY.map(({ icon: Icon, when, title }, i) => (
                <li key={title} className="flex items-center gap-3 border border-ink/10 bg-cream px-4 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center bg-ink text-xs font-extrabold text-white">{i + 1}</span>
                    <Icon size={16} className="shrink-0 text-coral" />
                    <span className="text-sm font-extrabold">{title}</span>
                    <span className="ml-auto hidden text-[11px] text-ink/45 sm:inline">{when}</span>
                </li>
            ))}
        </ol>
    );
}

export default function HowItWorks() {
    return (
        <OrganizerPage
            eyebrow="How it works"
            title="From first ticket to last guest in."
            lead="MXO follows your event from the day you announce it to the night you open the doors — and after, when it's time to count the money."
            aside={<JourneyPreview />}
        >
            <section className="space-y-8">
                <SectionHead eyebrow="Your event, step by step" title="What running an event on MXO looks like" />
                <ol className="relative space-y-6 border-l-2 border-ink/10 pl-8">
                    {JOURNEY.map(({ icon: Icon, when, title, text }) => (
                        <li key={title} className="relative">
                            <span className="absolute -left-[45px] top-0 grid h-8 w-8 place-items-center border-2 border-cream bg-coral text-white">
                                <Icon size={15} />
                            </span>
                            <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-ink/45">{when}</p>
                            <h3 className="mt-1 text-lg font-extrabold">{title}</h3>
                            <p className="mt-1 max-w-2xl text-ink/60">{text}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
                <SectionHead
                    eyebrow="Your team"
                    title="Share the work, keep control"
                    text="Give each person access to exactly their job. Nobody sees more than they need, and your event settings and payouts stay yours."
                />
                <dl className="divide-y divide-ink/10 border border-ink/10 bg-white">
                    {TEAM.map(([role, text]) => (
                        <div key={role} className="grid gap-1 p-5 sm:grid-cols-[160px_1fr]">
                            <dt className="font-extrabold">{role}</dt>
                            <dd className="text-sm text-ink/60">{text}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <FeatureCard icon={ShieldCheck} title="No overselling">Seats are held while a buyer pays, so two people can never get the same last ticket.</FeatureCard>
                <FeatureCard icon={BarChart3} title="Numbers you can trust">Sales, check-ins and cash collected update live on your dashboard.</FeatureCard>
                <FeatureCard icon={QrCode} title="One link, one QR">Your event link stays the same even after edits, so posters and shared links keep working.</FeatureCard>
            </section>
        </OrganizerPage>
    );
}
