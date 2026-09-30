import { Link } from 'react-router-dom';
import { BarChart3, Coffee, HandCoins, MapPin, Smartphone, Store, UserPlus } from 'lucide-react';
import OrganizerPage, { FeatureCard, SectionHead } from '../components/marketing/OrganizerPage.jsx';

const SETUP = [
    { icon: UserPlus, title: 'Invite the shop', text: 'Add the shop owner to your event team by email and choose the Ticket outlet role.' },
    { icon: HandCoins, title: 'Give them tickets', text: 'Decide which ticket types they can sell and how many. You can top it up or take it back later.' },
    { icon: Smartphone, title: 'They sell from a phone', text: 'Customers pay at the counter; the shop issues the ticket on MXO and the customer gets a QR ticket in their account.' }
];

const GOOD_FOR = [
    { icon: Coffee, title: 'Cafés and music stores', text: 'Places your crowd already visits.' },
    { icon: MapPin, title: 'Towns without card habits', text: 'Reach buyers who prefer to pay in cash.' },
    { icon: Store, title: 'Venue box offices', text: 'Let the venue sell your tickets on its own counter.' }
];

function ShopCard() {
    const rows = [['Early bird', 30, 21], ['Regular', 50, 12]];
    return (
        <figure className="border border-ink/10 bg-cream p-5">
            <figcaption className="flex items-center gap-2 border-b border-ink/10 pb-3 text-sm font-extrabold">
                <Store size={16} className="text-coral" /> Example: a partner shop's allocation
            </figcaption>
            <table className="mt-3 w-full text-sm">
                <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-ink/45"><th className="py-1 font-extrabold">Ticket</th><th className="font-extrabold">Given</th><th className="font-extrabold">Sold</th></tr>
                </thead>
                <tbody>
                    {rows.map(([name, given, sold]) => (
                        <tr key={name} className="border-t border-ink/10"><td className="py-2 font-bold">{name}</td><td>{given}</td><td>{sold}</td></tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}

export default function TicketOutlets() {
    return (
        <OrganizerPage
            eyebrow="Ticket outlets"
            title="Let local shops sell your tickets."
            lead="Some of your audience would rather walk in and pay cash. Turn trusted shops into ticket counters — with no paper tickets to print or deliver."
            aside={<ShopCard />}
            closing={{ title: 'Know a shop that could sell for you?', text: 'Invite them from your event’s Team tab.' }}
        >
            <section className="space-y-8">
                <SectionHead eyebrow="Setting up" title="A shop can start selling the same day" />
                <div className="grid gap-4 md:grid-cols-3">
                    {SETUP.map(({ icon: Icon, title, text }) => (
                        <article key={title} className="border border-ink/10 bg-white p-6">
                            <Icon size={22} className="text-coral" />
                            <h3 className="mt-4 font-extrabold">{title}</h3>
                            <p className="mt-2 text-sm text-ink/60">{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="space-y-8">
                <SectionHead eyebrow="Where it works best" title="Meet buyers where they already are" />
                <div className="grid gap-4 sm:grid-cols-3">
                    {GOOD_FOR.map((item) => <FeatureCard key={item.title} icon={item.icon} title={item.title}>{item.text}</FeatureCard>)}
                </div>
            </section>

            <section className="grid items-center gap-8 border border-ink/10 bg-white p-8 md:grid-cols-[auto_1fr]">
                <BarChart3 size={36} className="text-coral" />
                <div>
                    <h2 className="serif text-3xl">You always know where the cash is</h2>
                    <p className="mt-2 text-ink/60">
                        Each shop's sales show up on your event dashboard under their name, so you know how much every outlet has collected
                        before you go to pick it up. Cash sales are also totalled per event on your Settlements page.
                    </p>
                </div>
            </section>

            <p className="text-center text-sm text-ink/55">
                Own a shop and want to sell event tickets? <Link to="/contact" className="font-bold text-coral hover:underline">Get in touch</Link>.
            </p>
        </OrganizerPage>
    );
}
