import { Link } from 'react-router-dom';
import {
  Instagram, Twitter, Facebook, Youtube, Linkedin,
  Mail, MapPin, Phone, ArrowUpRight, ShieldCheck
} from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/10 bg-cream">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">

        {/* ---------- TOP: BRAND + NEWSLETTER ---------- */}
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <Link to="/" className="serif text-3xl italic text-ink">UTSAVX.</Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">
              India's home for live experiences — concerts, comedy, workshops, festivals
              aur bahut kuch. Discover, book, aur apne moments create karo.
            </p>

            {/* Contact chips */}
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-ink/70">
                <MapPin className="h-3.5 w-3.5 text-coral" /> Mumbai · Delhi · Bengaluru
              </span>
              <a href="mailto:hello@utsavx.com" className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-ink/70 hover:border-coral">
                <Mail className="h-3.5 w-3.5 text-coral" /> hello@utsavx.com
              </a>
              <a href="tel:+919999999999" className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-ink/70 hover:border-coral">
                <Phone className="h-3.5 w-3.5 text-coral" /> +91 99999 99999
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <p className="text-xs font-extrabold uppercase tracking-wider text-coral">Newsletter</p>
            <h3 className="serif mt-2 text-2xl">Never miss a drop.</h3>
            <p className="mt-1 text-sm text-ink/60">
              New events, early-bird tickets, aur exclusive offers — seedha inbox me.
            </p>
            <form
              onSubmit={(e) => { e.preventDefault(); /* TODO: wire up */ }}
              className="mt-4 flex gap-2"
            >
              <input
                type="email"
                required
                placeholder="you@email.com"
                className="w-full rounded-full border border-ink/20 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-coral"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
            <p className="mt-2 text-[11px] text-ink/45">
              By subscribing you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </div>

        {/* ---------- MIDDLE: LINK COLUMNS ---------- */}
        <div className="mt-14 grid grid-cols-2 gap-8 border-t border-ink/10 pt-10 sm:grid-cols-4">
          <FooterCol title="Explore">
            <FooterLink to="/events">All events</FooterLink>
            <FooterLink to="/events?category=music">Music</FooterLink>
            <FooterLink to="/events?category=comedy">Comedy</FooterLink>
            <FooterLink to="/events?category=workshop">Workshops</FooterLink>
            <FooterLink to="/events?category=festival">Festivals</FooterLink>
          </FooterCol>

          <FooterCol title="For Organizers">
            <FooterLink to="/organizer">Host an event</FooterLink>
            <FooterLink to="/manager/login">Manager sign in</FooterLink>
            <FooterLink to="/manager/signup">Become a partner</FooterLink>
            <FooterLink to="/pricing">Pricing</FooterLink>
          </FooterCol>

          <FooterCol title="Support">
            <FooterLink to="/help">Help center</FooterLink>
            <FooterLink to="/contact">Contact us</FooterLink>
            <FooterLink to="/refunds">Refund policy</FooterLink>
            <FooterLink to="/faq">FAQs</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink to="/about">About UTSAVX</FooterLink>
            <FooterLink to="/careers">Careers</FooterLink>
            <FooterLink to="/blog">Blog</FooterLink>
            <FooterLink to="/press">Press kit</FooterLink>
          </FooterCol>
        </div>

        {/* ---------- SOCIAL + PAYMENTS ---------- */}
        <div className="mt-10 flex flex-col gap-6 border-t border-ink/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          {/* Socials */}
          <div className="flex items-center gap-2">
            <span className="mr-2 text-xs font-bold uppercase tracking-wider text-ink/45">Follow</span>
            <SocialIcon href="https://instagram.com" label="Instagram"><Instagram className="h-4 w-4" /></SocialIcon>
            <SocialIcon href="https://twitter.com" label="Twitter"><Twitter className="h-4 w-4" /></SocialIcon>
            <SocialIcon href="https://facebook.com" label="Facebook"><Facebook className="h-4 w-4" /></SocialIcon>
            <SocialIcon href="https://youtube.com" label="YouTube"><Youtube className="h-4 w-4" /></SocialIcon>
            <SocialIcon href="https://linkedin.com" label="LinkedIn"><Linkedin className="h-4 w-4" /></SocialIcon>
          </div>

          {/* Payments */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink/50">
            <ShieldCheck className="h-4 w-4 text-coral" />
            <span className="font-bold">Secure payments:</span>
            {['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net Banking'].map((p) => (
              <span key={p} className="rounded-full border border-ink/10 bg-white px-2.5 py-1 font-bold text-ink/70">
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* ---------- BOTTOM BAR ---------- */}
        <div className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 text-xs text-ink/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} UTSAVX. All rights reserved. · Prices in ₹ (INR)</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/terms" className="hover:text-coral">Terms</Link>
            <Link to="/privacy" className="hover:text-coral">Privacy</Link>
            <Link to="/cookies" className="hover:text-coral">Cookies</Link>
            <Link to="/sitemap" className="hover:text-coral">Sitemap</Link>
            <a
              href="#top"
              className="inline-flex items-center gap-1 font-bold text-ink hover:text-coral"
            >
              Back to top <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Helpers ---------- */

function FooterCol({ title, children }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink/45">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="text-ink/70 transition hover:text-coral">
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/70 transition hover:border-coral hover:text-coral"
    >
      {children}
    </a>
  );
}