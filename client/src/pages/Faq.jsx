import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

const SECTIONS = [
  {
    id: 'buying',
    title: 'Buying tickets',
    items: [
      { q: 'How do I book a ticket?', a: 'Open an event, choose your ticket type and quantity, and tap Get tickets. Sign in (or create a free account), then pay on the checkout page. Your tickets appear in My tickets as soon as the payment goes through.' },
      { q: 'How do I pay?', a: 'Online payments go through Razorpay, so you can use UPI or a debit/credit card. Some organisers also sell tickets for cash through their team or partner shops.' },
      { q: 'Is there a booking fee?', a: 'No. The price shown on the event page is exactly what you pay.' },
      { q: 'Where are my tickets?', a: 'In My tickets, in your MXO account. Each ticket has its own QR code, and you can download it as an image or PDF if you want a copy offline.' },
      { q: 'Can I buy tickets for friends?', a: 'Yes — pick more than one ticket. Every ticket gets its own QR code in your account, so you can share or download them for your group.' },
      { q: 'Why are the seats only held for 15 minutes?', a: 'When you tap Pay, we hold your seats while you finish paying so nobody else can take them. If payment isn’t completed within 15 minutes, the seats go back on sale.' },
    ],
  },
  {
    id: 'event-day',
    title: 'At the event',
    items: [
      { q: 'What do I show at the entrance?', a: 'Your QR code from My tickets, on your phone or printed. Door staff scan it once — a ticket can’t be used twice.' },
      { q: 'Do I need ID?', a: 'That depends on the event. Some organisers check photo ID or age at the door, so read the event page before you go.' },
      { q: 'Can I leave and come back in?', a: 'Re-entry is up to the organiser. If it isn’t mentioned on the event page, ask them before the day.' },
    ],
  },
  {
    id: 'changes',
    title: 'Cancellations & refunds',
    items: [
      { q: 'What if an event is cancelled?', a: 'If an organiser cancels, paid orders are refunded. Online payments go back to the card or UPI account you paid with.' },
      { q: 'Can I cancel my own ticket?', a: 'Tickets can’t be cancelled from the app. Contact us with your order number and we’ll check the organiser’s policy with you.' },
      { q: 'How long does a refund take?', a: 'Once a refund is issued it usually reaches your account in 5–7 working days, depending on your bank.' },
    ],
  },
  {
    id: 'organizers',
    title: 'For organisers',
    items: [
      { q: 'How do I start hosting?', a: 'Create a host account (or switch your buyer account on the Host events page), add your event and ticket types, and submit it. Our team reviews it before it goes live.' },
      { q: 'What does it cost?', a: 'Listing is free. A service fee applies to each paid ticket — see the Pricing page for current rates and a fee calculator. Free tickets have no fees.' },
      { q: 'How do I get paid?', a: 'Add your bank account in Profile. Online earnings, after fees, are paid to that account. Cash sales stay with you, and the service fee on them is settled from your Settlements page.' },
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    items: [
      { q: 'How do I change my name, phone or password?', a: 'Open Profile from the account menu. You can edit your details, add a photo and change your password there.' },
      { q: 'I forgot my password.', a: 'Contact us from the email address on your account and we’ll help you get back in.' },
      { q: 'Can I change my sign-in email?', a: 'Not from the app yet. Contact us and we’ll update it for you.' },
    ],
  },
];

export default function Faq() {
  return (
    <StaticPage eyebrow="Help" title="Questions & answers" subtitle="Everything about booking, event day, refunds and hosting on MXO." maxWidth="max-w-3xl">
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id}>
            <h2 className="serif text-3xl">{section.title}</h2>
            <div className="mt-4 divide-y divide-ink/10 border border-ink/10 bg-white">
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
