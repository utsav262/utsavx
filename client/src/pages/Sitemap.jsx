import { Link } from 'react-router-dom';
import StaticPage from '../components/layout/StaticPage.jsx';

const GROUPS = [
  {
    title: 'Main',
    links: [
      ['Home', '/'],
      ['All events', '/events'],
      ['Cart', '/cart'],
      ['My tickets', '/tickets'],
      ['Dashboard', '/dashboard'],
    ],
  },
  {
    title: 'Organizers',
    links: [
      ['Host an event', '/organizer'],
      ['Manager sign in', '/manager/login'],
      ['Manager sign up', '/manager/signup'],
      ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Careers', '/careers'],
      ['Blog', '/blog'],
      ['Press', '/press'],
    ],
  },
  {
    title: 'Support',
    links: [
      ['Help center', '/help'],
      ['FAQs', '/faq'],
      ['Contact', '/contact'],
      ['Refunds', '/refunds'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Terms', '/terms'],
      ['Privacy', '/privacy'],
      ['Cookies', '/cookies'],
    ],
  },
];

export default function Sitemap() {
  return (
    <StaticPage eyebrow="Navigation" title="Sitemap" subtitle="Har page ek jagah." maxWidth="max-w-5xl">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-coral">{g.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {g.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-ink/70 hover:text-coral">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StaticPage>
  );
}
