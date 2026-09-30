import StaticPage from '../components/layout/StaticPage.jsx';
import { useSiteSettings } from '../lib/useSiteSettings.js';

export default function Cookies() {
  const site = useSiteSettings();
  return (
    <StaticPage eyebrow="Legal" title="Cookie Policy" subtitle="Last updated: 1 October 2026">
      <div className="prose prose-lg max-w-none space-y-6 text-ink/70">
        <p>
          MXO stores a small amount of information in your browser (cookies and local storage) so the site works —
          for example, to keep you signed in and remember your cart. We don’t use advertising or analytics cookies.
        </p>

        <h2 className="serif text-2xl text-ink">Types of cookies we use</h2>
        <div className="overflow-hidden border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left">
              <tr>
                <th className="p-3 font-bold">Type</th>
                <th className="p-3 font-bold">Purpose</th>
                <th className="p-3 font-bold">Can disable?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white">
              <tr><td className="p-3 font-bold">Essential</td><td className="p-3">Keeping you signed in, your cart, and security</td><td className="p-3">No</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="serif text-2xl text-ink">Managing cookies</h2>
        <p>
          You can manage or delete cookies in your browser settings. Note: disabling
          essential cookies will stop parts of the platform from working.
        </p>

        <h2 className="serif text-2xl text-ink">Contact</h2>
        <p>
          Questions? Email{' '}
          <a href={`mailto:${site.support_email}`} className="font-bold text-coral">{site.support_email}</a>
        </p>
      </div>
    </StaticPage>
  );
}
