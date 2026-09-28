import StaticPage from '../components/layout/StaticPage.jsx';

export default function Cookies() {
  return (
    <StaticPage eyebrow="Legal" title="Cookie Policy" subtitle="Last updated: 1 January 2026">
      <div className="prose prose-lg max-w-none space-y-6 text-ink/70">
        <p>
          UTSAVX cookies aur similar technologies use karta hai to improve your
          experience. Yeh page batata hai kaise.
        </p>

        <h2 className="serif text-2xl text-ink">Types of cookies we use</h2>
        <div className="overflow-hidden rounded-xl border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left">
              <tr>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">Purpose</th>
                <th className="p-3 font-bold">Can disable?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white">
              <tr><td className="p-3 font-bold">Essential</td><td className="p-3">Login, cart, security</td><td className="p-3">No</td></tr>
              <tr><td className="p-3 font-bold">Analytics</td><td className="p-3">Understand usage</td><td className="p-3">Yes</td></tr>
              <tr><td className="p-3 font-bold">Marketing</td><td className="p-3">Personalized ads</td><td className="p-3">Yes</td></tr>
              <tr><td className="p-3 font-bold">Preferences</td><td className="p-3">Language, city</td><td className="p-3">Yes</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="serif text-2xl text-ink">Managing cookies</h2>
        <p>
          Browser settings se cookies manage ya delete kar sakte ho. Note: essential
          cookies disable karne se platform sahi se kaam nahi karega.
        </p>

        <h2 className="serif text-2xl text-ink">Contact</h2>
        <p>
          Questions? Email{' '}
          <a href="mailto:privacy@utsavx.com" className="font-bold text-coral">privacy@utsavx.com</a>
        </p>
      </div>
    </StaticPage>
  );
}
