import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/index.js';
import { apiClient } from '../api/index.js';
import ManagerAuthShell, {
    ManagerAuthField,
    ManagerAuthLink
} from '../components/auth/ManagerAuthShell.jsx';

export default function AdminSignIn() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const response = await apiClient.login(form);
            const role = response.data.user?.role;
            if (role !== 'admin') {
                setError(
                    role === 'organizer'
                        ? 'This is a manager account. Sign in at Manager login.'
                        : 'Admin access only. Use the correct admin credentials.'
                );
                return;
            }
            dispatch(setUser(response.data));
            navigate('/admin');
        } catch (failure) {
            setError(failure.response?.data?.message || 'Admin sign in failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ManagerAuthShell
            eyebrow="UTSAVX admin"
            title={
                <>
                    Platform
                    <br />
                    <i>control.</i>
                </>
            }
            subtitle="Approve events, oversee the catalog, and keep UTSAVX India running cleanly."
            features={[
                'Review & approve event submissions',
                'Publish events to the public catalog',
                'Oversee organizers across India'
            ]}
            footer={
                <>
                    Hosting an event? <ManagerAuthLink to="/manager/login">Manager sign in</ManagerAuthLink>
                    <span className="mx-2 text-ink/30">·</span>
                    <ManagerAuthLink to="/login">Customer login</ManagerAuthLink>
                </>
            }
        >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Admin sign in</p>
            <h2 className="serif mt-3 text-4xl leading-none sm:text-5xl">Admin console</h2>
            <p className="mt-3 text-sm text-ink/55">Demo: admin@utsavx.com / password123</p>

            <form onSubmit={submit} className="mt-2">
                <ManagerAuthField
                    label="Admin email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@utsavx.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <ManagerAuthField
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    minLength={8}
                    placeholder="Your password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {error && (
                    <p className="mt-4 border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>
                )}
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-8 w-full bg-ink px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                >
                    {busy ? 'Signing in…' : 'Sign in as admin'}
                </button>
            </form>
        </ManagerAuthShell>
    );
}
