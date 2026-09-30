import { Link } from 'react-router-dom';
import { HandCoins, QrCode, ShieldCheck, Smartphone } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

const BELIEFS = [
  { icon: Smartphone, title: 'Booking should take seconds', body: 'Find an event, pay with UPI or card, and your ticket is ready. No queues, no printouts required.' },
  { icon: ShieldCheck, title: 'The price is the price', body: 'Buyers pay exactly what the event page shows. No surprise booking fee at checkout.' },
  { icon: HandCoins, title: 'Cash still matters', body: 'Plenty of tickets in India are sold hand to hand. Organisers can sell for cash through their team and partner shops — and still track every sale.' },
  { icon: QrCode, title: 'One ticket, one entry', body: 'Every ticket carries its own QR code that works once, so fakes and screenshots don’t get through the door.' }
];

export default function About() {
  return (
    <StaticPage
      eyebrow="About MXO"
      title="Tickets for the nights you’ll remember."
      subtitle="MXO is a ticketing platform for live events in India — built for the people who go, and the people who put them on."
      maxWidth="max-w-5xl"
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="serif text-3xl">Why we built it</h2>
          <div className="mt-4 space-y-4 text-ink/70">
            <p>
              Small and mid-sized events are the heart of every city — the gig at a café, the Sunday food market, the
              weekend workshop. They deserve ticketing that’s as easy for the organiser as it is for the crowd.
            </p>
            <p>
              So MXO does both sides: a simple way for you to find and book events, and one place for organisers to sell
              online and in cash, manage their team, and check guests in at the door.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {BELIEFS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="border border-ink/10 bg-white p-5">
              <Icon className="h-5 w-5 text-coral" />
              <h3 className="mt-3 font-extrabold">{title}</h3>
              <p className="mt-1 text-sm text-ink/60">{body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        <Link to="/events" className="group border border-ink/10 bg-white p-6 transition hover:border-coral">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Going out?</p>
          <p className="serif mt-2 text-2xl">See what’s on →</p>
        </Link>
        <Link to="/how-it-works" className="group bg-ink p-6 text-white transition hover:bg-coral">
          <p className="text-xs font-extrabold uppercase tracking-[.2em] text-butter">Hosting?</p>
          <p className="serif mt-2 text-2xl">See how MXO works for organisers →</p>
        </Link>
      </div>
    </StaticPage>
  );
}
