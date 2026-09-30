import { Link } from 'react-router-dom';
import { Ticket, CreditCard, Users, Calendar, Shield, LifeBuoy } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

const TOPICS = [
  { icon: <Ticket className="h-5 w-5 text-coral" />, title: 'Buying tickets', desc: 'How to book, ticket types, and delivery.', to: '/faq#buying' },
  { icon: <CreditCard className="h-5 w-5 text-coral" />, title: 'Payments & refunds', desc: 'UPI, cards, cancellations, refunds.', to: '/refunds' },
  { icon: <Calendar className="h-5 w-5 text-coral" />, title: 'Event day', desc: 'Entry rules, ID checks, gates timing.', to: '/faq#event-day' },
  { icon: <Users className="h-5 w-5 text-coral" />, title: 'For organizers', desc: 'Hosting, payouts, dashboard.', to: '/faq#organizers' },
  { icon: <Shield className="h-5 w-5 text-coral" />, title: 'Account & security', desc: 'Profile, password and privacy.', to: '/faq#account' },
  { icon: <LifeBuoy className="h-5 w-5 text-coral" />, title: 'Still stuck?', desc: 'Contact our support team.', to: '/contact' },
];

export default function Help() {
  return (
    <StaticPage eyebrow="Support" title="Help center" subtitle="Quick answers to common questions." maxWidth="max-w-5xl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <Link
            key={t.title}
            to={t.to}
            className="border border-ink/10 bg-white p-5 transition hover:border-coral"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10">{t.icon}</div>
            <p className="mt-4 font-bold">{t.title}</p>
            <p className="mt-1 text-sm text-ink/60">{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 border border-ink/10 bg-white p-6 text-center">
        <h3 className="serif text-2xl">Can't find what you need?</h3>
        <p className="mt-2 text-sm text-ink/60">Our team replies within 24 hours.</p>
        <Link to="/contact" className="mt-4 inline-block bg-coral px-6 py-3 font-bold text-white">
          Contact support
        </Link>
      </div>
    </StaticPage>
  );
}
