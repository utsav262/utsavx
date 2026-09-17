import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/index.js';
import { apiClient } from '../api/index.js';
import ManagerAuthShell, {
    ManagerAuthField,
    ManagerAuthLink
} from '../components/auth/ManagerAuthShell.jsx';

export default function ManagerSignUp() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setError('');

        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setBusy(true);
        try {
            const response = await apiClient.register({
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                role: 'organizer'
            });
            dispatch(setUser(response.data));
            navigate('/manager');
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not create manager account.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <ManagerAuthShell
            title={
                <>
                    Host your
                    <br />
                    <i>next night.</i>
                </>
            }
            subtitle="Create a manager account to publish events and sell tickets."
            footer={
                <>
                    Already have an account? <ManagerAuthLink to="/manager/login">Sign in</ManagerAuthLink>
                    <span className="mx-2 text-ink/30">·</span>
                    <ManagerAuthLink to="/login">Customer login</ManagerAuthLink>
                </>
            }
        >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Manager sign up</p>
            <h2 className="serif mt-3 text-4xl leading-none sm:text-5xl">Create organizer account</h2>
            <p className="mt-3 text-sm text-ink/55">You&apos;ll land in the manager workspace after signup.</p>

            <form onSubmit={submit} className="mt-2">
                <ManagerAuthField
                    label="Full name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <ManagerAuthField
                    label="Work email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@studio.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <ManagerAuthField
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <ManagerAuthField
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                {error && (
                    <p className="mt-4 border border-coral/25 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>
                )}
                <button
                    type="submit"
                    disabled={busy}
                    className="mt-8 w-full bg-coral px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                >
                    {busy ? 'Creating account…' : 'Create manager account'}
                </button>
            </form>
        </ManagerAuthShell>
    );
}
