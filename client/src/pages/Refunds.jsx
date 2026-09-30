import { Link } from 'react-router-dom';
import { Banknote, CalendarX, CreditCard, MessageCircle } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';
import { useSiteSettings } from '../lib/useSiteSettings.js';

export default function Refunds() {
  const site = useSiteSettings();
  return (
    <StaticPage eyebrow="Policies" title="Refunds" subtitle="What happens to your money if plans change." maxWidth="max-w-3xl">
      <div className="space-y-5">
        <Card icon={CalendarX} title="If the event is cancelled">
          Paid orders for a cancelled event are refunded in full. You don’t need to do anything — the refund is issued to the way you paid.
        </Card>
        <Card icon={MessageCircle} title="If you can’t make it">
          Tickets can’t be cancelled from the app, and whether a refund is possible depends on the organiser’s policy for that event.
          Contact us with your order number (you’ll find it in My tickets) and we’ll check it with the organiser.
        </Card>
        <Card icon={CreditCard} title="Paid online (UPI or card)">
          Refunds go back to the same UPI account or card. Once issued, they usually arrive within 5–7 working days, depending on your bank.
        </Card>
        <Card icon={Banknote} title="Paid in cash">
          Tickets bought for cash from an organiser’s team or a partner shop are refunded by the organiser directly. We’ll help you reach them.
        </Card>

        <div className="border border-ink/10 bg-white p-5 text-sm text-ink/70">
          <p className="font-extrabold text-ink">Need a refund or have a question?</p>
          <p className="mt-1">
            Email{' '}
            <a href={`mailto:${site.support_email}`} className="font-bold text-coral">{site.support_email}</a>
            {' '}with your order number, or use the <Link to="/contact" className="font-bold text-coral">contact page</Link>.
          </p>
        </div>
      </div>
    </StaticPage>
  );
}

function Card({ icon: Icon, title, children }) {
  return (
    <section className="flex gap-4 border border-ink/10 bg-white p-5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-coral" />
      <div>
        <h2 className="font-extrabold text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-ink/65">{children}</p>
      </div>
    </section>
  );
}
