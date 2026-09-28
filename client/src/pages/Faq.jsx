import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

const SECTIONS = [
  {
    id: 'buying',
    title: 'Buying tickets',
    items: [
      { q: 'How do I book a ticket?', a: 'Browse event page → Select tickets → Choose quantity → Proceed to checkout. Your ticket is delivered instantly via email and available in your account.' },
      { q: 'Can I buy for a friend?', a: 'Yes — select the "Send as gift" option during checkout to send the ticket directly to your friend’s email.' },
      { q: 'What payment methods work?', a: 'We support UPI, Credit/Debit cards, Net Banking, and popular digital wallets.' },
    ],
  },
  {
    id: 'event-day',
    title: 'Event day',
    items: [
      { q: 'What do I need at the gate?', a: 'A valid government photo ID along with your QR ticket (mobile screen or printout).' },
      { q: 'Can I re-enter?', a: 'Most events do not allow re-entry once inside. Check specific event policies on the event page.' },
      { q: 'Is there an age limit?', a: 'Age restrictions vary by event. 18+ events require mandatory photo ID verification at entry.' },
    ],
  },
  {
    id: 'organizers',
    title: 'For organizers',
    items: [
      { q: 'How do I start hosting?', a: 'Sign up as a Manager → verify your organization details → create your event → publish. Free plan available.' },
      { q: 'When do I get paid?', a: 'Payouts are processed within 3 business days after the event ends, directly to your registered bank account.' },
      { q: 'Can I customize fees?', a: 'Yes, platform fee customization is supported on Pro and Business plans.' },
    ],
  },
  {
    id: 'account',
    title: 'Account & security',
    items: [
      { q: 'How do I reset my password?', a: 'Go to the login page → Click "Forgot password" → Follow the reset link sent to your email.' },
      { q: 'Do you support 2FA?', a: 'Yes, you can enable Two-Factor Authentication under Settings → Security.' },
      { q: 'How do I delete my account?', a: 'Go to Settings → Privacy → Delete Account. Personal data will be permanently purged within 30 days.' },
    ],
  },
];

export default function Faq() {
  return (
    <StaticPage eyebrow="Help" title="FAQs" subtitle="Most common questions, answered." maxWidth="max-w-3xl">
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id}>
            <h2 className="serif text-3xl">{section.title}</h2>
            <div className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
              {section.items.map((item) => (
                <Accordion key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </StaticPage>
  );
}

function Accordion({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="font-bold">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-5 text-sm text-ink/70">{a}</p>}
    </div>
  );
}
