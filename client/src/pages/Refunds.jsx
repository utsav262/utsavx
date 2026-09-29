import StaticPage from '../components/layout/StaticPage.jsx';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

export default function Refunds() {
  return (
    <StaticPage eyebrow="Policies" title="Refund policy" subtitle="Clear rules. No surprises.">
      <div className="space-y-8 text-ink/70">
        <Section icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} title="When you get a full refund">
          <ul className="list-disc space-y-1 pl-5">
            <li>Event organizer cancels the event</li>
            <li>Event is postponed and you can't attend the new date</li>
            <li>Technical error caused a duplicate charge</li>
            <li>Request made within 24 hours of purchase AND 7+ days before event</li>
          </ul>
        </Section>

        <Section icon={<AlertCircle className="h-5 w-5 text-amber-500" />} title="Partial refunds">
          <ul className="list-disc space-y-1 pl-5">
            <li>Platform fee (2% + ₹5) non-refundable in most cases</li>
            <li>Payment gateway fee non-refundable (cards only)</li>
            <li>50% refund if cancelled 48–72 hours before event</li>
          </ul>
        </Section>

        <Section icon={<XCircle className="h-5 w-5 text-red-500" />} title="No refund">
          <ul className="list-disc space-y-1 pl-5">
            <li>Cancellation less than 48 hours before event</li>
            <li>No-show at the venue</li>
            <li>Denied entry due to invalid ID or age</li>
            <li>Event already started</li>
          </ul>
        </Section>

        <Section title="How to request a refund">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Go to <b>My Tickets</b> in your account</li>
            <li>Select the order → click <b>Request refund</b></li>
            <li>Choose a reason and submit</li>
            <li>Refund processed in 5–7 business days to source</li>
          </ol>
        </Section>

        <div className="border border-ink/10 bg-white p-5 text-sm">
          <p className="font-bold text-ink">Need help?</p>
          <p className="mt-1">
            Email <a href="mailto:refunds@utsavx.com" className="font-bold text-coral">refunds@utsavx.com</a>{' '}
            with your order ID.
          </p>
        </div>
      </div>
    </StaticPage>
  );
}

function Section({ icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="serif text-2xl text-ink">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
