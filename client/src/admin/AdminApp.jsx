import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import {
    BadgePercent, CalendarDays, FileClock, Globe2, LayoutGrid, LogOut, Megaphone, Menu,
    Moon, Receipt, Settings, Shield, Sun, Users, Wallet, X
} from 'lucide-react';
import { AdminAuthProvider, canSee, useAdminAuth } from './AdminAuth.jsx';
import AdminLogin from './pages/Login.jsx';
import AdminDashboard from './pages/Dashboard.jsx';
import AdminSettlements from './pages/Settlements.jsx';
import AdminUsers from './pages/Users.jsx';
import AdminEvents from './pages/Events.jsx';
import AdminOrders from './pages/Orders.jsx';
import AdminCoupons from './pages/Coupons.jsx';
import AdminNotifications from './pages/Notifications.jsx';
import AdminAdmins from './pages/AdminUsers.jsx';
import AdminAuditLog from './pages/AuditLog.jsx';
import AdminCountries from './pages/Countries.jsx';
import AdminSiteSettings from './pages/SiteSettings.jsx';

/** Menu is role-filtered to match the server's role matrix (admin/routes/index.js). */
const ALL = ['super_admin', 'admin', 'support'];
const STAFF = ['super_admin', 'admin'];
const MENU = [
    { to: '/admin', label: 'Dashboard', Icon: LayoutGrid, roles: ALL, end: true },
    { to: '/admin/users', label: 'Users', Icon: Users, roles: ALL },
    { to: '/admin/events', label: 'Events', Icon: CalendarDays, roles: ALL },
    { to: '/admin/orders', label: 'Orders & tickets', Icon: Receipt, roles: ALL },
    { to: '/admin/settlements', label: 'Settlements', Icon: Wallet, roles: ALL },
    { to: '/admin/coupons', label: 'Coupons', Icon: BadgePercent, roles: ALL },
    { to: '/admin/countries', label: 'Countries & fees', Icon: Globe2, roles: ALL },
    { to: '/admin/site', label: 'Site settings', Icon: Settings, roles: ALL },
    { to: '/admin/notifications', label: 'Notifications', Icon: Megaphone, roles: STAFF },
    { to: '/admin/admins', label: 'Admin users', Icon: Shield, roles: ['super_admin'] },
    { to: '/admin/audit', label: 'Audit log', Icon: FileClock, roles: STAFF }
];

const ROLE_LABEL = { super_admin: 'Super admin', admin: 'Admin', support: 'Support' };
const THEME_KEY = 'utsavx_admin_theme';

function readTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
    } catch {
        /* storage unavailable */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function RequireAdminSession() {
    const { admin, loading } = useAdminAuth();
    const location = useLocation();
    if (loading) return <p className="p-10 text-sm text-ink/50 dark:text-white/50">Loading…</p>;
    if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    return <Outlet />;
}

/** Hide pages a role can't use (the server enforces this too). */
function RoleGate({ roles, children }) {
    const { admin } = useAdminAuth();
    return canSee(admin, roles) ? children : <Navigate to="/admin" replace />;
}

function Layout({ theme, onToggleTheme }) {
    const { admin, logout } = useAdminAuth();
    const [open, setOpen] = useState(false);
    const location = useLocation();
    useEffect(() => setOpen(false), [location.pathname]);

    const items = MENU.filter((item) => canSee(admin, item.roles));

    const sidebar = (
        <nav className="flex h-full flex-col bg-ink text-white" aria-label="Admin">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                <span className="flex h-9 w-9 items-center justify-center bg-coral">
                    <Shield size={17} />
                </span>
                <div>
                    <p className="serif text-xl italic leading-none">MXO</p>
                    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">Admin console</p>
                </div>
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto p-3">
                {items.map(({ to, label, Icon, end }) => (
                    <li key={to}>
                        <NavLink
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition ${
                                        isActive ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`
                                }
                            >
                                <Icon size={16} /> {label}
                            </NavLink>
                    </li>
                ))}
            </ul>
            <div className="border-t border-white/10 p-4">
                <p className="truncate text-sm font-bold">{admin.name}</p>
                <p className="truncate text-xs text-white/50">{admin.email}</p>
                <span className="mt-2 inline-block bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                    {ROLE_LABEL[admin.role] || admin.role}
                </span>
                <button
                    type="button"
                    onClick={logout}
                    className="mt-4 flex w-full items-center justify-center gap-2 border border-white/20 px-3 py-2 text-xs font-extrabold uppercase tracking-wider hover:bg-white/10"
                >
                    <LogOut size={14} /> Sign out
                </button>
            </div>
        </nav>
    );

    return (
        <div className="min-h-screen bg-cream text-ink dark:bg-[#111111] dark:text-white">
            <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

            {open ? (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button type="button" className="absolute inset-0 bg-ink/60" aria-label="Close menu" onClick={() => setOpen(false)} />
                    <aside className="relative h-full w-64">{sidebar}</aside>
                </div>
            ) : null}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-[#111111]/95 sm:px-6">
                    <button type="button" onClick={() => setOpen(true)} className="p-2 lg:hidden" aria-label="Open menu">
                        {open ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Admin</p>
                    <button
                        type="button"
                        onClick={onToggleTheme}
                        className="ml-auto border border-ink/15 p-2 hover:border-coral dark:border-white/15"
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </header>
                <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default function AdminApp() {
    const [theme, setTheme] = useState(readTheme);
    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        try {
            localStorage.setItem(THEME_KEY, next);
        } catch {
            /* storage unavailable */
        }
    };

    return (
        <div className={theme === 'dark' ? 'dark' : ''}>
            {/* Drawers/modals portal here so they sit above the sidebar and keep the theme. */}
            <div id="admin-overlays" />
            <AdminAuthProvider>
                <Routes>
                    <Route path="login" element={<AdminLogin />} />
                    <Route element={<RequireAdminSession />}>
                        <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="events" element={<AdminEvents />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="settlements" element={<AdminSettlements />} />
                            <Route path="coupons" element={<AdminCoupons />} />
                            <Route path="countries" element={<AdminCountries />} />
                            <Route path="site" element={<AdminSiteSettings />} />
                            <Route path="notifications" element={<RoleGate roles={STAFF}><AdminNotifications /></RoleGate>} />
                            <Route path="admins" element={<RoleGate roles={['super_admin']}><AdminAdmins /></RoleGate>} />
                            <Route path="audit" element={<RoleGate roles={STAFF}><AdminAuditLog /></RoleGate>} />
                            <Route path="*" element={<Navigate to="/admin" replace />} />
                        </Route>
                    </Route>
                </Routes>
            </AdminAuthProvider>
        </div>
    );
}
