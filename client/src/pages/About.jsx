import { Link } from 'react-router-dom';
import { Sparkles, Users, MapPin, Heart } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage.jsx';

export default function About() {
  const stats = [
    { label: 'Events hosted', value: '12,000+' },
    { label: 'Cities', value: '48' },
    { label: 'Tickets sold', value: '2.4M' },
    { label: 'Avg rating', value: '4.8/5' },
  ];

  const values = [
    { icon: <Sparkles className="h-5 w-5 text-coral" />, title: 'Curated, not cluttered', body: 'Har event handpicked — no spam, no filler.' },
    { icon: <Users className="h-5 w-5 text-coral" />, title: 'Built for organizers', body: 'Tools that actually help you sell more tickets.' },
    { icon: <MapPin className="h-5 w-5 text-coral" />, title: 'India-first', body: 'UPI, regional languages, local pricing. Sab included.' },
    { icon: <Heart className="h-5 w-5 text-coral" />, title: 'Fans over algorithms', body: 'Tumhare taste ko respect karte hain, force nahi.' },
  ];

  return (
    <StaticPage eyebrow="Our story" title="About UTSAVX" subtitle="India's home for live experiences — built by fans, for fans.">
      <div className="space-y-12">
        <div className="prose prose-lg max-w-none text-ink/70">
          <p>
            UTSAVX 2024 me shuru hua ek simple idea ke saath: India me live events
            discover karna aur book karna itna easy hona chahiye jitna ek song play karna.
          </p>
          <p>
            Aaj hum 48 cities me 12,000+ events host kar chuke hain — concerts se lekar
            comedy nights, workshops, food festivals aur cultural nights tak. Har ticket
            ke peeche ek real fan ka moment hota hai, aur wahi humari jaan hai.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-ink/10 bg-white p-5">
              <p className="serif text-3xl">{s.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink/45">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Values */}
        <div>
          <h2 className="serif text-3xl">What we stand for</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-ink/10 bg-white p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10">{v.icon}</div>
                <p className="mt-4 font-bold">{v.title}</p>
                <p className="mt-1 text-sm text-ink/60">{v.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center">
          <h3 className="serif text-2xl">Want to host with us?</h3>
          <p className="mt-2 text-sm text-ink/60">Become an organizer and reach millions of fans.</p>
          <Link to="/organizer" className="mt-4 inline-block rounded-full bg-coral px-6 py-3 font-bold text-white">
            Get started
          </Link>
        </div>
      </div>
    </StaticPage>
  );
}
