import StaticPage from '../components/layout/StaticPage.jsx';

export default function Privacy() {
  return (
    <StaticPage eyebrow="Legal" title="Privacy Policy" subtitle="Last updated: 1 January 2026">
      <div className="prose prose-lg max-w-none space-y-6 text-ink/70">
        <p>
          MXO respects your privacy. This policy explains what data we
          collect, how we use it and what your rights are.
        </p>

        <h2 className="serif text-2xl text-ink">Data we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account info: name, email, phone</li>
          <li>Transaction data: orders, payment method (not full card)</li>
          <li>Usage data: pages visited, device, IP</li>
          <li>Location: city-level for event recommendations</li>
        </ul>

        <h2 className="serif text-2xl text-ink">How we use it</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Process bookings and send tickets</li>
          <li>Fraud prevention and security</li>
          <li>Personalized event recommendations</li>
          <li>Product improvements and analytics</li>
        </ul>

        <h2 className="serif text-2xl text-ink">Sharing</h2>
        <p>
          We never sell your data. We share it only with: event organizers (for
          entry), payment gateways, and legal authorities when required.
        </p>

        <h2 className="serif text-2xl text-ink">Your rights</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access your data</li>
          <li>Correct inaccuracies</li>
          <li>Delete your account</li>
          <li>Opt out of marketing</li>
        </ul>

        <h2 className="serif text-2xl text-ink">Security</h2>
        <p>
          We use industry-standard encryption (TLS, AES-256). Card data is
          processed only through PCI-DSS compliant payment gateways.
        </p>

        <h2 className="serif text-2xl text-ink">Contact</h2>
        <p>
          Privacy questions? Email{' '}
          <a href="mailto:privacy@utsavx.com" className="font-bold text-coral">privacy@utsavx.com</a>
        </p>
      </div>
    </StaticPage>
  );
}
