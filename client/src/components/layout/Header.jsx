import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, ShoppingBag, Ticket, UserRound, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { signOut } from '../../store/index.js';

function roleLabel(user) {
    if (!user) return 'Guest';
    if (user.staffRoleLabel) return user.staffRoleLabel;
    if (user.staffRole === 'Event_Scanner') return 'Event Scanner';
    if (user.role === 'admin') return 'Admin';
    if (user.role === 'organizer') return 'Manager';
    if (user.role === 'customer') return 'Customer';
    return 'Guest';
}

export default function Header() {
    const [open, setOpen] = useState(false);
    const user = useSelector((state) => state.auth.user);
    const count = useSelector((state) => state.cart.items.reduce((sum, item) => sum + item.quantity, 0));
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const role = user?.role;
    const isAdmin = role === 'admin';
    const isManager = role === 'organizer';
    const isCustomer = role === 'customer';
    const isStaff = Boolean(user?.staffRole || user?.staffEvents?.length);
    const isGuest = !user;
    const displayRole = roleLabel(user);

    const close = () => setOpen(false);
    const logout = () => {
        dispatch(signOut());
        close();
        navigate('/');
    };

    const links = [];
    links.push({ to: '/events', label: 'Discover' });

    if (isAdmin) {
        links.push({ to: '/admin', label: 'Admin' });
        links.push({ to: '/dashboard', label: 'Dashboard' });
        links.push({ to: '/tickets', label: 'My tickets' });
    } else if (isManager) {
        links.push({ to: '/dashboard', label: 'Dashboard' });
        links.push({ to: '/manager', label: 'Create / tools' });
        links.push({ to: '/tickets', label: 'My tickets' });
    } else if (isCustomer) {
        links.push({ to: '/tickets', label: 'My tickets' });
        if (isStaff) {
            links.push({ to: '/dashboard', label: 'Dashboard' });
            links.push({ to: '/invitations', label: 'Requests' });
        } else {
            links.push({ to: '/invitations', label: 'Invitations' });
            links.push({ to: '/organizer', label: 'Host events' });
        }
    } else {
        links.push({ to: '/organizer', label: 'For organizers' });
    }

    if ((isAdmin || isManager) && !links.some((link) => link.to === '/invitations')) {
        links.push({ to: '/invitations', label: 'Requests' });
    }

    return (
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
                <Link to="/" className="serif text-3xl italic tracking-tight">
                    UTSAVX<span className="text-coral">.</span>
                </Link>

                <nav className="hidden items-center gap-7 text-sm font-bold md:flex">
                    {links.map((link) => (
                        <Link key={link.to + link.label} to={link.to}>
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    {(isGuest || isCustomer || isAdmin || isManager) && (
                        <Link to="/cart" className="relative rounded-full border border-ink/15 p-2.5" aria-label="Cart">
                            <ShoppingBag size={18} />
                            {count > 0 && (
                                <span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
                                    {count}
                                </span>
                            )}
                        </Link>
                    )}

                    {user ? (
                        <div className="hidden items-center gap-2 sm:flex">
                            <span className="max-w-[12rem] truncate rounded-full border border-ink/10 px-3 py-2 text-xs font-bold text-ink/70">
                                {user.name || user.email}
                                <span className="ml-1 text-ink/40">· {displayRole}</span>
                            </span>
                            <button
                                type="button"
                                onClick={logout}
                                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white"
                            >
                                <LogOut size={15} /> Sign out
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="hidden items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white sm:flex"
                        >
                            <UserRound size={15} /> Log in
                        </Link>
                    )}

                    <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="rounded-full border border-ink/15 p-2.5 md:hidden"
                        aria-label="Menu"
                    >
                        {open ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {open && (
                <div className="border-t border-ink/10 px-5 py-4 md:hidden">
                    <div className="flex flex-col gap-4 text-sm font-bold">
                        {user && (
                            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-coral">
                                {displayRole} · {user.name || user.email}
                            </p>
                        )}
                        {links.map((link) => (
                            <Link key={link.to + link.label} to={link.to} onClick={close}>
                                {link.label}
                            </Link>
                        ))}
                        <Link to="/cart" onClick={close}>
                            Cart{count > 0 ? ` (${count})` : ''}
                        </Link>
                        {user ? (
                            <button type="button" onClick={logout} className="text-left">
                                Sign out
                            </button>
                        ) : (
                            <Link to="/login" onClick={close}>
                                Log in
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
