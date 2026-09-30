import { Link } from 'react-router-dom';
import { Barcode, Eye, Flame, Layers, QrCode, ScanLine, Sparkles, Type } from 'lucide-react';
import OrganizerPage, { SectionHead } from '../components/marketing/OrganizerPage.jsx';

const SECURITY = [
    { icon: Sparkles, title: 'Holograms', points: ['A tamper-evident hologram on the back of each ticket for stronger security.'] },
    { icon: Layers, title: 'Glossmark printing', points: ['Glossmarks reduce fraud and make authenticity checks easy.', 'They’re clear, and show up when the ticket is tilted.'] },
    { icon: Eye, title: 'UV security printing', points: ['UV security paper makes copied tickets easy to spot.', 'Invisible ink is verified in seconds with a black light.'] },
    { icon: Barcode, title: 'Unique QR code & serial number', points: ['Every ticket carries its own QR code and serial number, and scans only once at the gate.'] },
    { icon: Type, title: 'Security microtext', points: ['Microtext on the back is extremely hard to reproduce accurately.'] },
    { icon: Flame, title: 'Heat-sensitive media', points: ['Heat-sensitive ink changes colour when warmed by hand, for an instant authenticity check.'] }
];

function TicketMock() {
    return (
        <div className="relative mx-auto max-w-sm">
            <div className="flex overflow-hidden border border-ink/15 bg-white shadow-xl">
                <div className="flex-1 p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-coral">UTSAVX · Admit one</p>
                    <p className="serif mt-2 text-2xl leading-tight">Your Event Name</p>
                    <p className="mt-2 text-xs text-ink/55">Sat, 14 Dec · 7:00 PM</p>
                    <p className="text-xs text-ink/55">Venue, City</p>
                    <p className="mt-4 font-mono text-[11px] text-ink/45">No. 000482</p>
                </div>
                <div className="grid w-28 place-items-center border-l-2 border-dashed border-ink/15 bg-cream">
                    <QrCode size={64} strokeWidth={1.25} />
                </div>
            </div>
        </div>
    );
}

export default function PhysicalTickets() {
    return (
        <OrganizerPage
            eyebrow="Physical tickets"
            title="Printed tickets for your event"
            lead="Prefer paper? Get high-security printed tickets with holograms, UV ink, serial numbers and a unique QR code on every ticket — and scan them at the gate just like digital ones."
            aside={<TicketMock />}
            closing={{ title: 'Want printed tickets?', text: 'Tell us your event, quantity and the security features you need.' }}
        >
            <section className="space-y-8">
                <SectionHead
                    eyebrow="Security options"
                    title="Hard to copy. Easy to check."
                    text="Mix and match anti-fraud features so printed tickets are difficult to duplicate and quick to verify at the door."
                />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {SECURITY.map(({ icon: Icon, title, points }) => (
                        <article key={title} className="border border-ink/10 bg-white p-6">
                            <Icon size={22} className="text-coral" />
                            <h3 className="mt-4 font-extrabold">{title}</h3>
                            <ul className="mt-2 space-y-1.5 text-sm text-ink/60">
                                {points.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>

            <section className="grid items-center gap-8 border border-ink/10 bg-white p-8 md:grid-cols-[1fr_auto]">
                <div>
                    <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.2em] text-coral"><ScanLine size={14} /> Same gate, same scanner</p>
                    <h2 className="serif mt-2 text-3xl">Paper and digital tickets, checked in together</h2>
                    <p className="mt-2 text-ink/60">Each printed ticket’s QR code is tied to your event, so your scanners check in paper and phone tickets the same way, and duplicates are refused.</p>
                </div>
                <Link to="/contact" className="border border-ink px-6 py-3.5 text-center text-[12px] font-extrabold uppercase tracking-wider hover:border-coral hover:text-coral">
                    Request printed tickets
                </Link>
            </section>
        </OrganizerPage>
    );
}
