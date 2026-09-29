import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAdminAuth } from '../AdminAuth.jsx';

export default function AdminLogin() {
    const { admin, login } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    if (admin) return <Navigate to={location.state?.from || '/admin'} replace />;

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            await login(email.trim(), password);
            navigate(location.state?.from || '/admin', { replace: true });
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not sign in. Try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-ink px-4 py-10 text-ink">
            <form onSubmit={submit} className="w-full max-w-sm bg-cream p-8">
                <span className="flex h-10 w-10 items-center justify-center bg-coral text-white">
                    <Shield size={18} />
                </span>
                <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">UTSAVX admin console</p>
                <h1 className="serif mt-2 text-4xl">Sign in</h1>
                <p className="mt-2 text-sm text-ink/55">Staff accounts only. Customer and organizer logins don't work here.</p>

                <label className="mt-6 block text-xs font-extrabold uppercase tracking-wider text-ink/55" htmlFor="admin-email">Email</label>
                <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full border border-ink/20 bg-white px-4 py-3 text-sm outline-none focus:border-coral"
                />
                <label className="mt-4 block text-xs font-extrabold uppercase tracking-wider text-ink/55" htmlFor="admin-password">Password</label>
                <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full border border-ink/20 bg-white px-4 py-3 text-sm outline-none focus:border-coral"
                />
                {error ? <p className="mt-4 text-sm text-red-600" role="alert">{error}</p> : null}
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-6 w-full bg-coral px-4 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                >
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
        </main>
    );
}
