import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/index.js';
import { apiClient } from '../api/index.js';
import { unwrapList } from '../lib/unwrap.js';

function homeForRole(role, from) {
    if (from && from !== '/login') return from;
    if (role === 'admin') return '/admin';
    if (role === 'organizer') return '/dashboard';
    return '/tickets';
}

async function destinationAfterAuth(user, from) {
    if (user?.staffEvents?.length) return '/dashboard';
    try {
        const response = await apiClient.myInvitations({ status: 'P' });
        if (unwrapList(response).length) return '/invitations';
    } catch {
        /* fall through to role home */
    }
    if (user?.role === 'organizer' || user?.role === 'admin') return homeForRole(user?.role, from);
    return homeForRole(user?.role, from);
}

export default function Login() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;
    const [signup, setSignup] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
    const [error, setError] = useState('');

    const submit = async (event) => {
        event.preventDefault();
        try {
            const payload = signup ? form : { email: form.email, password: form.password };
            const response = signup ? await apiClient.register(payload) : await apiClient.login(payload);
            dispatch(setUser(response.data));
            const next = await destinationAfterAuth(response.data.user, from);
            navigate(next, { replace: true });
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not authenticate.');
        }
    };

    return (
        <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-14 px-5 py-14 lg:grid-cols-2 lg:px-8">
            <div className="hidden bg-moss p-12 text-white lg:block">
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-butter">UTSAVX members</p>
                <h1 className="serif mt-5 text-7xl leading-[.9]">
                    Keep the
                    <br />
                    <i>good stuff</i>
                    <br />
                    close.
                </h1>
                <p className="mt-8 text-sm text-white/70">Demo: emma@utsavx.com / password123</p>
            </div>
            <form onSubmit={submit} className="mx-auto w-full max-w-md">
                <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Welcome back</p>
                <h1 className="serif mt-3 text-5xl">{signup ? 'Create account' : 'Log in to UTSAVX'}</h1>
                {from === '/checkout' && (
                    <p className="mt-3 text-sm text-ink/55">Sign in to finish checkout. Your cart is saved.</p>
                )}
                {signup && (
                    <input
                        required
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        className="mt-8 w-full rounded-full border border-ink/20 bg-transparent px-5 py-3.5"
                        placeholder="Your name"
                    />
                )}
                <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    className="mt-4 w-full rounded-full border border-ink/20 bg-transparent px-5 py-3.5"
                    placeholder="Email address"
                />
                <input
                    required
                    minLength="8"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    className="mt-4 w-full rounded-full border border-ink/20 bg-transparent px-5 py-3.5"
                    placeholder={signup ? 'Password (8+ chars, letter + number)' : 'Password'}
                />
                {signup && (
                    <label className="mt-4 flex items-center gap-2 text-sm text-ink/70">
                        <input
                            type="checkbox"
                            checked={form.role === 'organizer'}
                            onChange={(event) =>
                                setForm({ ...form, role: event.target.checked ? 'organizer' : 'customer' })
                            }
                        />
                        I want to host events
                    </label>
                )}
                {error && <p className="mt-4 text-sm text-coral">{error}</p>}
                <button className="mt-5 w-full rounded-full bg-coral px-5 py-3.5 font-extrabold text-white">
                    {signup ? 'Create account' : 'Log in'}
                </button>
                <button
                    type="button"
                    onClick={() => setSignup(!signup)}
                    className="mt-5 w-full text-sm text-ink/60"
                >
                    {signup ? 'Already have an account? Log in' : 'New here? Create an account'}
                </button>
            </form>
        </main>
    );
}
