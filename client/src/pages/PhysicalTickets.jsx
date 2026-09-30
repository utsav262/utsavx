import { Link } from 'react-router-dom';
import { Gift, PartyPopper, QrCode, ScanLine, Ticket } from 'lucide-react';
import OrganizerPage, { SectionHead } from '../components/marketing/OrganizerPage.jsx';

const WHY_PAPER = [
    { icon: Gift, title: 'Gifting and hampers', text: 'A ticket you can hold makes a better present or sponsor giveaway.' },
    { icon: PartyPopper, title: 'Keepsakes', text: 'Fans like a souvenir from a festival or a milestone show.' },
    { icon: Ticket, title: 'Guests without smartphones', text: 'Everyone can still get in, phone or no phone.' }
];

const ANTI_COPY = [
    ['A code that works once', 'Every printed ticket carries its own MXO QR code. After it is scanned at the door, the same code is refused — so photocopies are useless.'],
    ['Numbered tickets', 'A serial number on each ticket makes it easy to spot gaps or duplicates when you count stock.'],
    ['Special paper and inks', 'For bigger events, printers can add features that are hard to copy, such as foil or holographic stickers, UV-visible ink or fine-print patterns. Tell us what you need and we will look into it with you.']
];

function PaperTicket() {
    return (
        <div className="mx-auto max-w-sm rotate-[-2deg]">
            <div className="flex overflow-hidden border border-ink/15 bg-white shadow-xl">
                <div className="flex-1 p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-coral">Admit one</p>
                    <p className="serif mt-2 text-2xl leading-tight">Your event</p>
                    <p className="mt-2 text-xs text-ink/55">Date · Time · Venue</p>
                    <p className="mt-4 font-mono text-[11px] text-ink/45">#000482</p>
                </div>
                <div className="grid w-28 place-items-center border-l-2 border-dashed border-ink/15 bg-cream">
                    <QrCode size={60} strokeWidth={1.25} />
                </div>
            </div>
        </div>
    );
}

export default function PhysicalTickets() {
    return (
        <OrganizerPage
            eyebrow="Physical tickets"
            title="Paper tickets that scan like digital ones."
            lead="Most guests are happy with a ticket on their phone. When you want something they can hold, printed tickets can carry the same one-time QR code — so the door stays just as fast."
            aside={<PaperTicket />}
            closing={{ title: 'Planning printed tickets?', text: 'Tell us the event, how many you need and what they should look like.' }}
        >
            <section className="space-y-8">
                <SectionHead eyebrow="When paper helps" title="Good reasons to print" />
                <div className="grid gap-4 sm:grid-cols-3">
                    {WHY_PAPER.map(({ icon: Icon, title, text }) => (
                        <article key={title} className="border border-ink/10 bg-white p-6">
                            <Icon size={22} className="text-coral" />
                            <h3 className="mt-4 font-extrabold">{title}</h3>
                            <p className="mt-2 text-sm text-ink/60">{text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
                <SectionHead
                    eyebrow="Stopping fakes"
                    title="Harder to copy, quick to check"
                    text="The QR code does most of the work. Extra print features are optional for events that need them."
                />
                <dl className="divide-y divide-ink/10 border border-ink/10 bg-white">
                    {ANTI_COPY.map(([title, text]) => (
                        <div key={title} className="p-5">
                            <dt className="font-extrabold">{title}</dt>
                            <dd className="mt-1 text-sm text-ink/60">{text}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="grid items-center gap-8 border border-ink/10 bg-white p-8 md:grid-cols-[1fr_auto]">
                <div>
                    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.2em] text-coral"><ScanLine size={14} /> One door, one scanner</p>
                    <h2 className="serif mt-2 text-3xl">Phone and paper tickets, checked in together</h2>
                    <p className="mt-2 text-ink/60">Door staff don't need to know which kind a guest has — they scan, and MXO confirms it.</p>
                </div>
                <Link to="/contact" className="border border-ink px-6 py-3.5 text-center text-[12px] font-extrabold uppercase tracking-wider hover:border-coral hover:text-coral">
                    Talk to us about printing
                </Link>
            </section>
        </OrganizerPage>
    );
}
