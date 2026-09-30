import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

export default function Blog() {
  return (
    <StaticPage eyebrow="Stories" title="Blog" subtitle="Event guides, organiser tips and product news." maxWidth="max-w-3xl">
      <div className="border border-dashed border-ink/15 bg-white px-6 py-14 text-center">
        <PenLine className="mx-auto h-6 w-6 text-coral" />
        <p className="serif mt-3 text-2xl">Our first stories are being written</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
          We’ll share guides for going out, tips for organisers and updates to MXO here. In the meantime, there’s plenty on.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/events" className="bg-coral px-5 py-2.5 text-sm font-extrabold text-white">Browse events</Link>
          <Link to="/how-it-works" className="border border-ink/20 px-5 py-2.5 text-sm font-extrabold hover:border-coral">Hosting guide</Link>
        </div>
      </div>
    </StaticPage>
  );
}
