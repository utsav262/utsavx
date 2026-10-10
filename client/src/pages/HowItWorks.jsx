import {
    BarChart3, CalendarPlus, ClipboardList, GraduationCap, Building2, Lock, Megaphone, QrCode, ShieldCheck, Sparkles,
    Ticket, Trophy, User, Users, UtensilsCrossed, Wallet, Plane, Presentation
} from 'lucide-react';
import OrganizerPage, { FeatureCard, SectionHead } from '../components/marketing/OrganizerPage.jsx';

/** The host's journey, told in order — the page is built around this timeline. */
const JOURNEY = [
    {
        icon: CalendarPlus,
        when: 'Weeks before',
        title: 'Set up your event',
        text: 'Pick who you are (school, company, club, individual…) and what kind of event it is. Add the date, time zone, venue or online link, photos, and the details that matter for your event: classes and teams for a sports day, speakers and agenda for a conference, an itinerary for a trip.'
    },
    {
        icon: Ticket,
        when: 'Same sitting',
        title: 'Add tickets and registration',
        text: 'Choose paid tickets or free registration, set a participant limit and when registration opens and closes. Create as many tiers as you need: group passes that admit a whole family on one QR, and tiers that include lunch.'
    },
    {
        icon: ClipboardList,
        when: 'Before going live',
        title: 'Review and submit',
        text: 'A final checklist shows anything missing, with a link straight to the step that needs it. Save a draft any time and come back later. Our team gives new events a quick check before they go live.'
    },
    {
        icon: Megaphone,
        when: 'On-sale day',
        title: 'Open ticket sales',
        text: 'Share your event link or QR code anywhere, or keep the event private so only people with the link can find it. Guests pay with UPI or card and get their ticket in their MXO account straight away.'
    },
    {
        icon: Users,
        when: 'The build-up',
        title: 'Bring in your team',
        text: 'Invite co-organizers, volunteers, promoters and partner shops. Each person gets access to exactly their job, and every sale is credited to the right person.'
    },
    {
        icon: QrCode,
        when: 'Event day',
        title: 'Scan guests in — and to lunch',
        text: 'Door staff scan each ticket from a phone; group passes let everyone in with one scan. If the ticket includes lunch, the same QR is scanned again at the lunch counter, once, after entry.'
    },
    {
        icon: Wallet,
        when: 'After the event',
        title: 'Settle up',
        text: 'See exactly what was sold, by whom and for how much, plus check-ins and lunches served. Online earnings go to your bank account after the platform fee; cash sales are totalled for a simple settlement.'
    }
];

const HOSTS = [
    { icon: GraduationCap, title: 'Schools & colleges', text: 'Annual days, fests, sports days and exhibitions — with classes, teacher coordinators and parent-consent options.' },
    { icon: Building2, title: 'Companies & startups', text: 'Conferences, launches, hackathons and team days — with speakers, agenda and networking sessions.' },
    { icon: Trophy, title: 'Sports clubs', text: 'Tournaments and matches — with teams, fixtures, format and officials.' },
    { icon: User, title: 'Individuals', text: 'Birthdays, weddings and reunions — keep them private, with RSVP and guest limits.' },
    { icon: Presentation, title: 'Trainers & creators', text: 'Workshops and masterclasses — with instructor, skill level, sessions and certificates.' },
    { icon: Plane, title: 'Travel & experiences', text: 'Treks, trips and walks — with itinerary, meeting point and what to bring.' }
];

const TEAM = [
    ['Event managers', 'Run tickets, discount codes, team, sales and check-in alongside you. Editing or cancelling the event stays with you.'],
    ['Gate staff & volunteers', 'Scan tickets at the entrance and the lunch counter. Optionally sell at the gate. No access to payouts.'],
    ['Promoters', 'Sell from their phone and collect cash, limited to the tickets you give them.'],
    ['Partner shops', 'Sell over the counter from their own allocation of tickets.']
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
            lead="Whether you're a school, a company, a club or planning a birthday, MXO follows your event from the day you set it up to the moment you open the doors — and after, when it's time to count the money."
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

            <section className="space-y-8">
                <SectionHead
                    eyebrow="Built for every organizer"
                    title="The form adapts to your event"
                    text="Tell us who's organizing and what kind of event it is, and you only see the fields that matter."
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {HOSTS.map(({ icon, title, text }) => (
                        <FeatureCard key={title} icon={icon} title={title}>{text}</FeatureCard>
                    ))}
                </div>
            </section>

            <section className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
                <SectionHead
                    eyebrow="Your team"
                    title="Share the work, keep control"
                    text="Give each person access to exactly their job. Nobody sees more than they need, and your event settings and payouts stay yours."
                />
                <dl className="divide-y divide-ink/10 border border-ink/10 bg-white">
                    {TEAM.map(([role, text]) => (
                        <div key={role} className="grid gap-1 p-5 sm:grid-cols-[180px_1fr]">
                            <dt className="font-extrabold">{role}</dt>
                            <dd className="text-sm text-ink/60">{text}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FeatureCard icon={Users} title="Group passes">One ticket can admit up to 20 people — a student and both parents get in with a single scan.</FeatureCard>
                <FeatureCard icon={UtensilsCrossed} title="Lunch on the same ticket">Tiers can include lunch. Staff scan the same QR at the counter, once, after entry.</FeatureCard>
                <FeatureCard icon={Lock} title="Private events">Hidden from listings and search; your guest list and contact details are never shown publicly.</FeatureCard>
                <FeatureCard icon={ShieldCheck} title="No overselling">Seats are held while a buyer pays, and registration and sale windows are enforced at checkout.</FeatureCard>
                <FeatureCard icon={BarChart3} title="Numbers you can trust">Sales, check-ins, lunches served and cash collected update live on your dashboard.</FeatureCard>
                <FeatureCard icon={Sparkles} title="Clear earnings">Buyers pay the ticket price; you see exactly what you receive after the platform fee before you publish.</FeatureCard>
            </section>
        </OrganizerPage>
    );
}
