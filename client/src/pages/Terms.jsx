import StaticPage from '../components/layout/StaticPage.jsx';

export default function Terms() {
  return (
    <StaticPage eyebrow="Legal" title="Terms of Service" subtitle="Last updated: 1 January 2026">
      <div className="prose prose-lg max-w-none space-y-6 text-ink/70">
        <p>
          Welcome to UTSAVX. By using our platform you agree to these terms. Please
          read them carefully.
        </p>

        <h2 className="serif text-2xl text-ink">1. Acceptance of terms</h2>
        <p>
          By accessing or using UTSAVX, you confirm that you are at least 18 years
          old (or have guardian consent) and agree to be bound by these terms.
        </p>

        <h2 className="serif text-2xl text-ink">2. Your account</h2>
        <p>
          You are responsible for maintaining confidentiality of your account and
          password. Notify us immediately of any unauthorized use.
        </p>

        <h2 className="serif text-2xl text-ink">3. Ticket purchases</h2>
        <p>
          All ticket sales are subject to availability and confirmation. Prices are
          in INR and inclusive of applicable taxes unless stated. Refunds follow our{' '}
          <a href="/refunds" className="font-bold text-coral">Refund Policy</a>.
        </p>

        <h2 className="serif text-2xl text-ink">4. Event changes</h2>
        <p>
          Organizers may reschedule or cancel events. In such cases, you will be
          notified via email and refunds will be processed as per policy.
        </p>

        <h2 className="serif text-2xl text-ink">5. Prohibited conduct</h2>
        <p>
          You agree not to misuse the platform, including reselling tickets without
          authorization, fraudulent bookings, or scraping data.
        </p>

        <h2 className="serif text-2xl text-ink">6. Limitation of liability</h2>
        <p>
          UTSAVX acts as a ticketing platform and is not responsible for the actual
          event experience, artist performance, or venue conditions.
        </p>

        <h2 className="serif text-2xl text-ink">7. Changes to terms</h2>
        <p>
          We may update these terms. Continued use after changes means acceptance.
        </p>

        <h2 className="serif text-2xl text-ink">8. Contact</h2>
        <p>
          Questions? Email{' '}
          <a href="mailto:legal@utsavx.com" className="font-bold text-coral">legal@utsavx.com</a>
        </p>
      </div>
    </StaticPage>
  );
}
