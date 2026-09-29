import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import StaticPage from '../components/layout/StaticPage.jsx';

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    note: 'For first-time organizers',
    features: [
      { ok: true,  text: 'Up to 2 events / month' },
      { ok: true,  text: 'Basic ticket types' },
      { ok: true,  text: 'UPI + card payments' },
      { ok: true,  text: 'Email support' },
      { ok: false, text: 'Custom branding' },
      { ok: false, text: 'Team collaboration' },
    ],
    cta: 'Start free',
    to: '/manager/signup',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹1,999',
    note: 'per month · most popular',
    features: [
      { ok: true,  text: 'Unlimited events' },
      { ok: true,  text: 'Custom branding' },
      { ok: true,  text: 'Team collaboration (10 seats)' },
      { ok: true,  text: 'Advanced analytics' },
      { ok: true,  text: 'Priority support' },
      { ok: true,  text: 'Custom fee structure' },
    ],
    cta: 'Go Pro',
    to: '/manager/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '₹7,499',
    note: 'per month · scaling teams',
    features: [
      { ok: true,  text: 'Everything in Pro' },
      { ok: true,  text: 'Unlimited team seats' },
      { ok: true,  text: 'Dedicated account manager' },
      { ok: true,  text: 'White-label checkout' },
      { ok: true,  text: 'API access' },
      { ok: true,  text: 'SLA + 24/7 support' },
    ],
    cta: 'Talk to sales',
    to: '/contact',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <StaticPage eyebrow="Plans" title="Simple pricing" subtitle="Start free. Scale when you're ready. No hidden charges." maxWidth="max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col border bg-white p-6 ${
              p.highlight ? 'border-coral shadow-lg ring-2 ring-coral/20' : 'border-ink/10'
            }`}
          >
            {p.highlight && (
              <span className="mb-3 self-start bg-coral px-3 py-1 text-xs font-bold text-white">
                Most popular
              </span>
            )}
            <p className="font-bold">{p.name}</p>
            <p className="mt-2 text-4xl font-extrabold">{p.price}</p>
            <p className="mt-1 text-xs text-ink/50">{p.note}</p>

            <ul className="mt-6 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f.text} className="flex items-start gap-2">
                  {f.ok ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-ink/30" />
                  )}
                  <span className={f.ok ? 'text-ink/75' : 'text-ink/40'}>{f.text}</span>
                </li>
              ))}
            </ul>

            <Link
              to={p.to}
              className={`mt-6 px-5 py-3 text-center text-sm font-bold ${
                p.highlight
                  ? 'bg-coral text-white hover:opacity-90'
                  : 'border border-ink/20 text-ink hover:border-coral hover:text-coral'
              }`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-10 border border-ink/10 bg-white p-6 text-sm text-ink/60">
        <p className="font-bold text-ink">Platform fee</p>
        <p className="mt-1">
          Each ticket carries a 2% + ₹5 platform fee. Payment gateway fees are extra
          (UPI free, cards 2%). Fees configurable on Pro and above.
        </p>
      </div>
    </StaticPage>
  );
}
