import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut, Menu, ShoppingBag, UserRound, X, ChevronDown,
  Ticket, LayoutDashboard, Sparkles, ShieldCheck, Mail,
  Calendar, Plus, Bell, Search, Landmark, Settings
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { signOut } from '../../store/index.js';

/* ----------------------------- helpers ----------------------------- */
export function roleLabel(user) {
  if (!user) return 'Guest';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'organizer') return 'Manager';
  if (user.role === 'customer') {
    if (user.staffRole && user.staffRole !== 'Manager') {
      return user.staffRoleLabel || user.staffRole;
    }
    if (user.staffRole === 'Manager') return 'Event Manager';
    return 'Customer';
  }
  return 'Guest';
}

function roleBadgeClass(user) {
  if (!user) return 'bg-ink/10 text-ink/60';
  if (user.role === 'admin') return 'bg-purple-100 text-purple-700';
  if (user.role === 'organizer') return 'bg-coral/15 text-coral';
  if (user.role === 'customer') return 'bg-emerald-100 text-emerald-700';
  return 'bg-ink/10 text-ink/60';
}

/* ------------------------------ Header ----------------------------- */
export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef(null);

  const user = useSelector((s) => s.auth.user);
  const count = useSelector((s) =>
    s.cart.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const role = user?.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'organizer';
  const isCustomer = role === 'customer';
  const isStaff = Boolean(user?.staffRole || user?.staffEvents?.length);
  const hasPendingInvites = Number(user?.pendingInviteCount || 0) > 0;
  const isGuest = !user;
  const displayRole = roleLabel(user);

  /* ---------- scroll shadow ---------- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---------- outside click for user menu ---------- */
  useEffect(() => {
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ---------- nav links (role-aware) ---------- */
  const links = [];
  if (!isManager) links.push({ to: '/events', label: 'Discover' });

  if (isAdmin) {
    links.push({ to: '/admin-legacy', label: 'Admin' });
    links.push({ to: '/dashboard', label: 'Dashboard' });
  } else if (isManager) {
    links.push({ to: '/dashboard', label: 'Dashboard' });
    links.push({ to: '/manager', label: 'Workspace' });
  } else if (isCustomer) {
    if (isStaff) {
      links.push({ to: '/dashboard', label: 'Dashboard' });
    } else {
      links.push({ to: '/organizer', label: 'Host events' });
    }
  } else {
    links.push({ to: '/organizer', label: 'For organizers' });
    links.push({ to: '/how-it-works', label: 'How it works' });
    links.push({ to: '/pricing', label: 'Pricing' });
  }

  const close = () => setMobileOpen(false);

  const logout = () => {
    dispatch(signOut());
    setUserMenuOpen(false);
    close();
    navigate('/');
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all ${
        scrolled
          ? 'border-ink/10 bg-cream/85 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-cream'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3.5 lg:px-8">
        {/* ---------- Logo ---------- */}
        <Link
          to="/"
          className="group flex items-center gap-2 shrink-0"
          aria-label="MXO home"
        >
          <span className="serif text-3xl italic leading-none tracking-tight">
            MXO
          </span>
          <span className="h-2 w-2 rounded-full bg-coral transition group-hover:scale-125" />
        </Link>

        {/* ---------- Desktop Nav ---------- */}
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to + l.label}
              to={l.to}
              className={({ isActive }) =>
                `px-3.5 py-2 text-sm font-bold transition ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {(isAdmin || isManager || isStaff) && (
            <NavLink
              to="/invitations"
              className={({ isActive }) =>
                `relative px-3.5 py-2 text-sm font-bold transition ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              Requests
              {hasPendingInvites && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-coral">
                  <span className="absolute inset-0 animate-ping bg-coral/60" />
                </span>
              )}
            </NavLink>
          )}
        </nav>

        {/* ---------- Right actions ---------- */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Search (desktop only) */}
          <Link
            to="/events"
            className="hidden border border-ink/15 p-2.5 text-ink/70 transition hover:border-coral hover:text-coral md:inline-flex"
            aria-label="Search events"
          >
            <Search size={17} />
          </Link>

          {/* Cart */}
          {!isAdmin && !isManager && (
          <Link
            to="/cart"
            className="relative border border-ink/15 p-2.5 text-ink/70 transition hover:border-coral hover:text-coral"
            aria-label={`Cart${count ? ` (${count} items)` : ''}`}
          >
            <ShoppingBag size={17} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-coral px-1 text-[10px] font-extrabold text-white ring-2 ring-cream">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>
          )}

          {/* User menu (desktop) */}
          {user ? (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 border border-ink/15 bg-white py-1.5 pl-1.5 pr-2.5 transition hover:border-coral"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-coral/15 text-xs font-extrabold text-coral">
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[9rem] truncate text-xs font-bold text-ink">
                  {user.name || user.email?.split('@')[0]}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-ink/50 transition ${userMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden border border-ink/10 bg-white shadow-xl">
                  {/* User info */}
                  <div className="border-b border-ink/10 px-4 py-3.5">
                    <p className="truncate text-sm font-bold">
                      {user.name || 'Guest'}
                    </p>
                    <p className="truncate text-xs text-ink/55">{user.email}</p>
                    <span
                      className={`mt-2 inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${roleBadgeClass(
                        user
                      )}`}
                    >
                      {displayRole}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <MenuItem to="/profile" icon={<Settings size={15} />} onClick={() => setUserMenuOpen(false)}>
                      Profile
                    </MenuItem>
                    <MenuItem to="/tickets" icon={<Ticket size={15} />} onClick={() => setUserMenuOpen(false)}>
                      My tickets
                    </MenuItem>
                    <MenuItem to="/notifications" icon={<Bell size={15} />} onClick={() => setUserMenuOpen(false)}>
                      Notifications
                    </MenuItem>
                    {isManager && (
                      <MenuItem to="/dashboard/settlements" icon={<Landmark size={15} />} onClick={() => setUserMenuOpen(false)}>
                        Settlements
                      </MenuItem>
                    )}
                    {(isAdmin || isManager || isStaff) && (
                      <MenuItem
                        to="/dashboard"
                        icon={<LayoutDashboard size={15} />}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Dashboard
                      </MenuItem>
                    )}
                    {(isAdmin || isManager || isStaff) && (
                      <MenuItem
                        to="/invitations"
                        icon={<Mail size={15} />}
                        badge={hasPendingInvites ? user?.pendingInviteCount : null}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Requests
                      </MenuItem>
                    )}
                    {isManager && (
                      <MenuItem
                        to="/manager"
                        icon={<Sparkles size={15} />}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Create event
                      </MenuItem>
                    )}
                    {isAdmin && (
                      <MenuItem
                        to="/admin-legacy"
                        icon={<ShieldCheck size={15} />}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin panel
                      </MenuItem>
                    )}
                    {isCustomer && !isStaff && (
                      <MenuItem
                        to="/organizer"
                        icon={<Plus size={15} />}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Host an event
                      </MenuItem>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-ink/10 p-1.5">
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="px-3.5 py-2 text-sm font-bold text-ink/70 hover:text-ink"
              >
                Log in
              </Link>
              <Link
                to="/manager/signup"
                className="inline-flex items-center gap-1.5 bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink/90"
              >
                <Sparkles size={14} /> Host events
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="border border-ink/15 p-2.5 text-ink/70 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ---------- Mobile Drawer ---------- */}
      {mobileOpen && (
        <div className="border-t border-ink/10 bg-cream md:hidden">
          <div className="mx-auto max-w-7xl px-5 py-4">
            {/* User card */}
            {user ? (
              <div className="mb-4 flex items-center gap-3 border border-ink/10 bg-white p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/15 text-sm font-extrabold text-coral">
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {user.name || 'Guest'}
                  </p>
                  <p className="truncate text-xs text-ink/55">{user.email}</p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-extrabold uppercase ${roleBadgeClass(
                    user
                  )}`}
                >
                  {displayRole}
                </span>
              </div>
            ) : (
              <div className="mb-4 flex gap-2">
                <Link
                  to="/login"
                  onClick={close}
                  className="flex-1 border border-ink/20 py-2.5 text-center text-sm font-bold"
                >
                  Log in
                </Link>
                <Link
                  to="/manager/signup"
                  onClick={close}
                  className="flex-1 bg-ink py-2.5 text-center text-sm font-bold text-white"
                >
                  Host events
                </Link>
              </div>
            )}

            {/* Links */}
            <nav className="flex flex-col gap-1 text-sm font-bold">
              {links.map((l) => (
                <NavLink
                  key={l.to + l.label}
                  to={l.to}
                  onClick={close}
                  className={({ isActive }) =>
                    `px-3 py-2.5 transition ${
                      isActive
                        ? 'bg-ink text-white'
                        : 'text-ink/70 hover:bg-ink/5'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {user && (
                <MobileLink to="/profile" icon={<Settings size={16} />} onClick={close}>
                  Profile
                </MobileLink>
              )}
              <MobileLink to="/tickets" icon={<Ticket size={16} />} onClick={close}>
                My tickets
              </MobileLink>
              {(isAdmin || isManager || isStaff) && (
                <MobileLink
                  to="/invitations"
                  icon={<Bell size={16} />}
                  onClick={close}
                  badge={hasPendingInvites ? user?.pendingInviteCount : null}
                >
                  Requests
                </MobileLink>
              )}
              {!isAdmin && !isManager && (
                <MobileLink to="/cart" icon={<ShoppingBag size={16} />} onClick={close} badge={count || null}>
                  Cart
                </MobileLink>
              )}
            </nav>

            {/* Logout */}
            {user && (
              <button
                type="button"
                onClick={logout}
                className="mt-3 flex w-full items-center justify-center gap-2 bg-red-50 py-3 text-sm font-bold text-red-600"
              >
                <LogOut size={15} /> Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* --------------------------- Small components --------------------------- */
function MenuItem({ to, icon, children, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-ink/75 transition hover:bg-ink/5 hover:text-ink"
    >
      <span className="text-ink/50">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? (
        <span className="bg-coral px-1.5 text-[10px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function MobileLink({ to, icon, children, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 transition ${
          isActive
            ? 'bg-ink text-white'
            : 'text-ink/70 hover:bg-ink/5'
        }`
      }
    >
      <span className="opacity-70">{icon}</span>
      <span className="flex-1">{children}</span>
      {badge ? (
        <span className="bg-coral px-1.5 text-[10px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </NavLink>
  );
}