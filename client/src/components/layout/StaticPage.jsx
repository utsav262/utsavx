import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function StaticPage({ eyebrow, title, subtitle, children, maxWidth = 'max-w-4xl' }) {
  return (
    <main className="bg-cream">
      {/* Hero */}
      <section className="border-b border-ink/10 bg-white">
        <div className={`mx-auto ${maxWidth} px-5 py-14 lg:px-8 lg:py-20`}>
          <nav className="flex items-center gap-1 text-xs text-ink/45">
            <Link to="/" className="hover:text-coral">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-bold text-ink/70">{title}</span>
          </nav>
          {eyebrow && (
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[.2em] text-coral">{eyebrow}</p>
          )}
          <h1 className="serif mt-2 text-5xl leading-[1] sm:text-6xl lg:text-7xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-lg text-ink/60">{subtitle}</p>}
        </div>
      </section>

      {/* Body */}
      <section className={`mx-auto ${maxWidth} px-5 py-12 lg:px-8 lg:py-16`}>
        {children}
      </section>
    </main>
  );
}
