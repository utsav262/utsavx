import { Mail } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';
import { useSiteSettings } from '../lib/useSiteSettings.js';

const COLORS = [
  ['Coral', '#E85D4C', 'bg-coral'],
  ['Ink', '#1A1A1A', 'bg-ink'],
  ['Cream', '#F7F3EB', 'bg-cream'],
  ['Moss', '#2D4A3E', 'bg-moss'],
  ['Butter', '#F0C75E', 'bg-butter']
];

export default function Press() {
  const site = useSiteSettings();
  return (
    <StaticPage eyebrow="Media" title="Press" subtitle="The basics for writing about MXO." maxWidth="max-w-3xl">
      <div className="space-y-6">
        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-extrabold">In one line</h2>
          <p className="mt-2 text-ink/70">MXO is a ticketing platform for live events in India — buyers book with UPI or card, and organisers sell online and in cash, manage their team and scan guests in.</p>
        </section>

        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-extrabold">Name & wordmark</h2>
          <p className="mt-2 text-sm text-ink/65">Write the name in capitals: <b>MXO</b>. The wordmark is set in an italic serif with a coral full stop.</p>
          <p className="serif mt-4 text-5xl italic">MXO<span className="text-coral">.</span></p>
        </section>

        <section className="border border-ink/10 bg-white p-6">
          <h2 className="font-extrabold">Colours</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {COLORS.map(([name, hex, cls]) => (
              <div key={name}>
                <div className={`h-14 border border-ink/10 ${cls}`} />
                <p className="mt-1.5 text-sm font-bold">{name}</p>
                <p className="font-mono text-xs text-ink/50">{hex}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 border border-ink/10 bg-white p-6">
          <div>
            <h2 className="font-extrabold">Media enquiries</h2>
            <p className="mt-1 text-sm text-ink/65">For interviews, logo files or anything else, get in touch.</p>
          </div>
          <a href={`mailto:${site.support_email}?subject=${encodeURIComponent('Press enquiry')}`} className="inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-sm font-extrabold text-white hover:bg-coral">
            <Mail className="h-4 w-4" /> Email us
          </a>
        </section>
      </div>
    </StaticPage>
  );
}
