import { Mail } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';
import { useSiteSettings } from '../lib/useSiteSettings.js';

export default function Careers() {
  const site = useSiteSettings();
  return (
    <StaticPage eyebrow="Join us" title="Careers" subtitle="Help build the easiest way to go out — and to put on a great event." maxWidth="max-w-3xl">
      <div className="border border-ink/10 bg-white p-6">
        <h2 className="serif text-2xl">No open roles right now</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          We’re a small team and aren’t hiring for specific roles at the moment. If you love live events and think you could help —
          in engineering, design, partnerships or support — we’d still like to hear from you.
        </p>
        <a href={`mailto:${site.support_email}?subject=${encodeURIComponent('Working at MXO')}`} className="mt-5 inline-flex items-center gap-2 bg-coral px-5 py-2.5 text-sm font-extrabold text-white">
          <Mail className="h-4 w-4" /> Write to us
        </a>
      </div>
    </StaticPage>
  );
}
