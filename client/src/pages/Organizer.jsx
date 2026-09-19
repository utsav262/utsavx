import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/index.js';
import { apiClient } from '../api/index.js';

export default function Organizer() {
    const user = useSelector((state) => state.auth.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const upgrade = async () => {
        setBusy(true);
        setError('');
        try {
            const response = await apiClient.becomeOrganizer();
            dispatch(setUser(response.data));
            navigate('/manager', { replace: true });
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not enable hosting.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">For hosts</p>
            <h1 className="serif mt-3 text-6xl sm:text-8xl">Put your event in front of people who show up.</h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/65">
                Create events across India, sell tickets in ₹, invite staff, and check guests in from one workspace.
            </p>

            {user?.role === 'customer' ? (
                <div className="mt-8">
                    <p className="text-sm text-ink/55">
                        You&apos;re signed in as <b>{user.email}</b>. Upgrade this account to start hosting.
                    </p>
                    {error && <p className="mt-3 text-sm text-coral">{error}</p>}
                    <button
                        type="button"
                        disabled={busy}
                        onClick={upgrade}
                        className="mt-5 bg-coral px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                    >
                        {busy ? 'Enabling…' : 'Become a manager'}
                    </button>
                </div>
            ) : user?.role === 'organizer' ? (
                <div className="mt-8">
                    <Link
                        to="/manager"
                        className="inline-flex bg-coral px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white"
                    >
                        Open manager workspace
                    </Link>
                </div>
            ) : user?.role === 'admin' ? (
                <div className="mt-8">
                    <Link
                        to="/admin"
                        className="inline-flex bg-ink px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white"
                    >
                        Open admin console
                    </Link>
                </div>
            ) : (
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                        to="/manager/login"
                        className="bg-coral px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white"
                    >
                        Manager sign in
                    </Link>
                    <Link
                        to="/manager/signup"
                        className="border border-ink/20 px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider"
                    >
                        Create manager account
                    </Link>
                </div>
            )}
        </main>
    );
}
