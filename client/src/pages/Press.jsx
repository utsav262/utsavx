import { Download, Mail } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

export default function Press() {
  return (
    <StaticPage eyebrow="Media" title="Press kit" subtitle="Brand assets, logos, aur media inquiries.">
      <div className="space-y-8">
        <div>
          <h2 className="serif text-2xl">Brand assets</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { name: 'Primary logo (SVG)', size: '12 KB' },
              { name: 'Logo (PNG)', size: '240 KB' },
              { name: 'Brand colors', size: '8 KB' },
              { name: 'Typography guide', size: '45 KB' },
            ].map((a) => (
              <a
                key={a.name}
                href="#"
                className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-4 transition hover:border-coral"
              >
                <div>
                  <p className="font-bold text-sm">{a.name}</p>
                  <p className="text-xs text-ink/45">{a.size}</p>
                </div>
                <Download className="h-4 w-4 text-coral" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="serif text-2xl">Company facts</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ['Founded', '2024'],
              ['Headquarters', 'Mumbai, India'],
              ['Founder & CEO', 'Aarav Mehta'],
              ['Employees', '120+'],
              ['Cities', '48'],
              ['Events hosted', '12,000+'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-ink/10 bg-white p-4">
                <dt className="text-xs font-bold uppercase tracking-wider text-ink/45">{k}</dt>
                <dd className="mt-1 font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-coral" />
            <div>
              <p className="font-bold">Media inquiries</p>
              <p className="mt-1 text-sm text-ink/60">
                For interviews, quotes, or press passes —{' '}
                <a href="mailto:press@utsavx.com" className="font-bold text-coral">press@utsavx.com</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </StaticPage>
  );
}
