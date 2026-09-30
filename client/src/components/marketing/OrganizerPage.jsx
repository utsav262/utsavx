import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';

export const ORGANIZER_LINKS = [
    { to: '/how-it-works', label: 'How it works' },
    { to: '/ticket-outlets', label: 'Ticket outlets' },
    { to: '/physical-tickets', label: 'Physical tickets' },
    { to: '/pricing', label: 'Pricing' }
];

/** Hosts go straight to their workspace; everyone else signs up as a host first. */
export function useStartSellingLink() {
    const role = useSelector((s) => s.auth.user?.role);
    return role === 'organizer' ? '/manager' : '/manager/signup';
}

export function StartSellingButton({ children = 'Start selling tickets', tone = 'coral' }) {
    const to = useStartSellingLink();
    return (
        <Link
            to={to}
            className={`inline-flex items-center gap-2 px-6 py-3.5 text-[12px] font-extrabold uppercase tracking-wider transition ${
                tone === 'light' ? 'bg-white text-ink hover:bg-coral hover:text-white' : 'bg-coral text-white hover:bg-ink'
            }`}
        >
            {children} <ArrowRight size={15} />
        </Link>
    );
}

/** Shared shell for the organizer marketing pages: hero, section tabs, closing call to action. */
export default function OrganizerPage({ eyebrow, title, lead, aside, children, closing }) {
    return (
        <main className="bg-cream">
            <section className="border-b border-ink/10 bg-white">
                <div className="mx-auto max-w-6xl px-5 lg:px-8">
                    <nav aria-label="For organizers" className="-mx-5 flex gap-1 overflow-x-auto px-5 pt-5 lg:mx-0 lg:px-0">
                        {ORGANIZER_LINKS.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `shrink-0 border-b-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider transition ${
                                        isActive ? 'border-coral text-ink' : 'border-transparent text-ink/45 hover:text-ink'
                                    }`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="grid items-center gap-10 py-12 lg:grid-cols-[1.2fr_1fr] lg:py-16">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">{eyebrow}</p>
                            <h1 className="serif mt-2 text-5xl leading-[1] sm:text-6xl">{title}</h1>
                            {lead ? <p className="mt-5 max-w-xl text-lg text-ink/60">{lead}</p> : null}
                            <div className="mt-7"><StartSellingButton /></div>
                        </div>
                        {aside ? <div>{aside}</div> : null}
                    </div>
                </div>
            </section>

            <div className="mx-auto max-w-6xl space-y-16 px-5 py-14 lg:px-8 lg:py-20">{children}</div>

            <section className="bg-ink text-white">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-5 py-12 lg:px-8">
                    <div>
                        <p className="serif text-4xl">{closing?.title || 'Ready to sell your first ticket?'}</p>
                        <p className="mt-2 text-white/60">{closing?.text || 'Listing an event is free. You only pay when you sell.'}</p>
                    </div>
                    <StartSellingButton tone="light" />
                </div>
            </section>
        </main>
    );
}

export function SectionHead({ eyebrow, title, text }) {
    return (
        <div className="max-w-2xl">
            {eyebrow ? <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">{eyebrow}</p> : null}
            <h2 className="serif mt-2 text-4xl leading-tight">{title}</h2>
            {text ? <p className="mt-3 text-ink/60">{text}</p> : null}
        </div>
    );
}

export function FeatureCard({ icon: Icon, title, children }) {
    return (
        <article className="border border-ink/10 bg-white p-6">
            {Icon ? <Icon size={22} className="text-coral" /> : null}
            <h3 className="mt-4 font-extrabold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">{children}</p>
        </article>
    );
}
