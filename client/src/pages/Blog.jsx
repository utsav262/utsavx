import { Link } from 'react-router-dom';
import StaticPage from '../components/layout/StaticPage.jsx';
import { formatDate } from '../lib/datetime.js';

const POSTS = [
  { slug: 'top-10-concerts-2026', title: 'Top 10 concerts to catch in 2026', excerpt: 'From AR Rahman to Diljit, the full lineup you cannot miss.', category: 'Music', date: '2026-03-12', author: 'Aarav M.' },
  { slug: 'how-to-host-first-event', title: 'How to host your first event', excerpt: 'Zero se hero tak — ek complete playbook for new organizers.', category: 'Guides', date: '2026-03-08', author: 'Priya S.' },
  { slug: 'comedy-scene-india', title: 'The comedy scene in India is exploding', excerpt: 'Why 2026 is the year of Indian stand-up.', category: 'Culture', date: '2026-02-28', author: 'Rohan K.' },
  { slug: 'upi-tickets-guide', title: 'Pay for tickets with UPI in 2 taps', excerpt: 'New checkout flow live for all users.', category: 'Product', date: '2026-02-15', author: 'MXO Team' },
  { slug: 'festival-packing-list', title: 'The ultimate festival packing list', excerpt: 'Everything from sunscreen to a power bank.', category: 'Guides', date: '2026-02-01', author: 'Neha T.' },
  { slug: 'artist-spotlight-nucleya', title: 'Artist spotlight: Nucleya', excerpt: 'Bass music ka baap — ek deep dive.', category: 'Music', date: '2026-01-20', author: 'Aarav M.' },
];

export default function Blog() {
  const featured = POSTS[0];
  const rest = POSTS.slice(1);

  return (
    <StaticPage eyebrow="Stories" title="Blog" subtitle="Event guides, artist spotlights and product updates." maxWidth="max-w-5xl">
      {/* Featured */}
      <Link to={`/blog/${featured.slug}`} className="group block overflow-hidden border border-ink/10 bg-white">
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="aspect-[4/3] bg-gradient-to-br from-coral/30 via-coral/10 to-cream" />
          <div className="p-6">
            <span className="bg-coral/10 px-3 py-1 text-xs font-bold text-coral">{featured.category}</span>
            <h2 className="serif mt-3 text-3xl leading-tight group-hover:text-coral">{featured.title}</h2>
            <p className="mt-2 text-sm text-ink/60">{featured.excerpt}</p>
            <p className="mt-4 text-xs text-ink/45">
              {featured.author} · {formatDate(featured.date)}
            </p>
          </div>
        </div>
      </Link>

      {/* Grid */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p) => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="group border border-ink/10 bg-white p-5 transition hover:border-coral">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">{p.category}</span>
            <h3 className="serif mt-2 text-xl leading-tight group-hover:text-coral">{p.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-ink/60">{p.excerpt}</p>
            <p className="mt-4 text-xs text-ink/45">{formatDate(p.date)}</p>
          </Link>
        ))}
      </div>
    </StaticPage>
  );
}
