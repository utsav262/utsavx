import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell, BookOpen, Compass, CreditCard, Landmark, LayoutDashboard, LogOut, Mail, Menu,
  Plus, Printer, Settings, Store, Ticket, Wrench, X
} from 'lucide-react';
import { signOut } from '../../store/index.js';
import { roleLabel } from './Header.jsx';

/** Sign-in/sign-up screens keep the public layout; every other page uses the host shell. */
const PUBLIC_ONLY = [/^\/login\/?$/, /^\/organizer\/?$/, /^\/manager\/(login|signin|signup)\/?$/, /^\/admin-legacy/];

export function useInManagerShell() {
  const user = useSelector((s) => s.auth.user);
  const { pathname } = useLocation();
  const isHost = user?.role === 'organizer';
  const isStaff = user?.role === 'customer' && Boolean(user?.staffRole || user?.staffEvents?.length);
  return Boolean((isHost || isStaff) && !PUBLIC_ONLY.some((re) => re.test(pathname)));
}

function navFor(user) {
  const host = user?.role === 'organizer';
  const invites = Number(user?.pendingInviteCount || 0) || null;
  const main = host
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/manager', label: 'Workspace', icon: Wrench, state: { view: 'home' } },
        { to: '/invitations', label: 'Requests', icon: Mail, badge: invites },
        { to: '/dashboard/settlements', label: 'Settlements', icon: Landmark },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/profile', label: 'Profile & bank', icon: Settings }
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/invitations', label: 'Requests', icon: Mail, badge: invites },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/tickets', label: 'My tickets', icon: Ticket },
        { to: '/profile', label: 'Profile', icon: Settings }
      ];
  const learn = host
    ? [
        { to: '/how-it-works', label: 'How it works', icon: BookOpen },
        { to: '/ticket-outlets', label: 'Ticket outlets', icon: Store },
        { to: '/physical-tickets', label: 'Physical tickets', icon: Printer },
        { to: '/pricing', label: 'Pricing', icon: CreditCard }
      ]
    : [];
  return { host, main, learn };
}

function Item({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      state={item.state}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm font-bold transition ${
          isActive ? 'border-coral bg-white/10 text-white' : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon size={17} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? <span className="bg-coral px-1.5 py-0.5 text-[10px] font-extrabold text-white">{item.badge}</span> : null}
    </NavLink>
  );
}

function Sidebar({ onNavigate }) {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { host, main, learn } = navFor(user);
  const initials = (user?.name || user?.email || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const logout = () => {
    dispatch(signOut());
    onNavigate?.();
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link to="/dashboard" onClick={onNavigate} className="serif text-2xl italic">
          UTSAVX<span className="text-coral">.</span>
        </Link>
        <span className="ml-2 border border-white/20 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[.16em] text-white/60">
          {host ? 'Host' : 'Team'}
        </span>
      </div>

      {host ? (
        <div className="px-4 pb-4">
          <Link
            to="/manager"
            state={{ view: 'create' }}
            onClick={onNavigate}
            className="flex items-center justify-center gap-2 bg-coral px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-white transition hover:bg-white hover:text-ink"
          >
            <Plus size={15} /> Create event
          </Link>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto pb-4" aria-label="Host navigation">
        {main.map((item) => <Item key={item.to} item={item} onNavigate={onNavigate} />)}
        {learn.length ? (
          <>
            <p className="mt-6 px-5 pb-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-white/35">Grow your events</p>
            {learn.map((item) => <Item key={item.to} item={item} onNavigate={onNavigate} />)}
          </>
        ) : null}
        <p className="mt-6 px-5 pb-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-white/35">UTSAVX</p>
        <Item item={{ to: '/events', label: 'Browse events', icon: Compass }} onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link to="/profile" onClick={onNavigate} className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center bg-white text-xs font-extrabold text-ink">{initials}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user?.name}</span>
            <span className="block truncate text-[11px] text-white/50">{roleLabel(user)}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 border border-white/15 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white/70 hover:border-red-400 hover:text-red-300"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

/** Host/staff app layout: fixed sidebar on desktop, slide-in drawer on phones. */
export default function ManagerShell({ children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink/10 bg-white px-4 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center border border-ink/15">
          <Menu size={18} />
        </button>
        <Link to="/dashboard" className="serif text-xl italic">UTSAVX<span className="text-coral">.</span></Link>
        <Link to="/notifications" aria-label="Notifications" className="grid h-10 w-10 place-items-center border border-ink/15">
          <Bell size={17} />
        </Link>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center text-white/70 hover:text-white">
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <div className="flex-1">{children}</div>
        <footer className="border-t border-ink/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs text-ink/50 lg:px-8">
            <span>© {new Date().getFullYear()} UTSAVX · Prices in ₹ (INR)</span>
            <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
              {[['/help', 'Help'], ['/contact', 'Contact'], ['/faq', 'FAQs'], ['/refunds', 'Refunds'], ['/terms', 'Terms'], ['/privacy', 'Privacy']].map(([to, label]) => (
                <Link key={to} to={to} className="hover:text-coral">{label}</Link>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
