import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin, Briefcase } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

const JOBS = [
  { title: 'Senior Frontend Engineer', dept: 'Engineering', type: 'Full-time', loc: 'Bengaluru / Remote' },
  { title: 'Product Designer', dept: 'Design', type: 'Full-time', loc: 'Mumbai' },
  { title: 'Event Partnerships Lead', dept: 'Growth', type: 'Full-time', loc: 'Delhi NCR' },
  { title: 'Customer Support Specialist', dept: 'Operations', type: 'Full-time', loc: 'Remote' },
  { title: 'Data Analyst', dept: 'Analytics', type: 'Contract', loc: 'Remote' },
  { title: 'Marketing Intern', dept: 'Marketing', type: 'Internship', loc: 'Mumbai' },
];

export default function Careers() {
  return (
    <StaticPage eyebrow="Join us" title="Careers" subtitle="Help us shape how India experiences live events.">
      <div className="space-y-6">
        <div className="border border-ink/10 bg-white p-6">
          <h2 className="serif text-2xl">Why MXO?</h2>
          <ul className="mt-4 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
            <li>• Remote-first culture</li>
            <li>• Free tickets to every event</li>
            <li>• Health insurance for you + family</li>
            <li>• Annual learning budget</li>
            <li>• Flexible hours</li>
            <li>• Stock options (ESOPs)</li>
          </ul>
        </div>

        <div>
          <h2 className="serif text-3xl">Open roles</h2>
          <div className="mt-4 divide-y divide-ink/10 border border-ink/10 bg-white">
            {JOBS.map((j) => (
              <Link
                key={j.title}
                to={`/careers/${j.title.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex items-center justify-between gap-4 p-5 transition hover:bg-cream"
              >
                <div>
                  <p className="font-bold">{j.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink/55">
                    <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {j.dept}</span>
                    <span>· {j.type}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.loc}</span>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-ink/40 transition group-hover:text-coral" />
              </Link>
            ))}
          </div>
        </div>

        <p className="text-sm text-ink/55">
          Don't see your role? Send your resume to{' '}
          <a href="mailto:careers@utsavx.com" className="font-bold text-coral">careers@utsavx.com</a>
        </p>
      </div>
    </StaticPage>
  );
}
