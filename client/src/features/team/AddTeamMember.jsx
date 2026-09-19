import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiClient } from '../../api/index.js';
import { useToast } from '../../components/ui/Toast.jsx';

const TYPES = [
    { id: 'Manager', label: 'Event Manager' },
    { id: 'Event_Scanner', label: 'Gate Staff' },
    { id: 'Ambassador', label: 'Ticket Ambassador' },
    { id: 'Outlet', label: 'Ticket Outlet' }
];

const COMMISSION_CHIPS = [5, 10, 15, 20, 25, 30, 40, 50];

export default function AddTeamMember() {
    const { eventId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const user = useSelector((state) => state.auth.user);

    const seedType = location.state?.type || 'Event_Scanner';
    const eventTitle = location.state?.eventTitle || 'Event';
    const ticketTypes = location.state?.ticketTypes || [];
    const canAddManager = user?.role === 'organizer' || user?.role === 'admin';

    const allowedTypes = useMemo(
        () => TYPES.filter((row) => (row.id === 'Manager' ? canAddManager : true)),
        [canAddManager]
    );

    const [type, setType] = useState(
        allowedTypes.some((row) => row.id === seedType) ? seedType : allowedTypes[0]?.id || 'Event_Scanner'
    );
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [scannerPermission, setScannerPermission] = useState('scan_only');
    const [commission, setCommission] = useState(10);
    const [ack, setAck] = useState(false);
    const [ownAmbassador, setOwnAmbassador] = useState(true);
    const [allotments, setAllotments] = useState(() =>
        Object.fromEntries((ticketTypes || []).map((tier) => [String(tier._id || tier.id), 0]))
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const needsAllotments = type === 'Ambassador' || type === 'Outlet';
    const needsCommission = type === 'Ambassador';
    const needsScannerPerm = type === 'Event_Scanner';

    const setAllotment = (ticketId, qty) => {
        setAllotments((prev) => ({
            ...prev,
            [ticketId]: Math.max(0, Math.floor(Number(qty) || 0))
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        if (!email.trim()) return setError('Email is required.');
        if (!firstName.trim()) return setError('First name is required.');
        if (!ack) return setError('Please acknowledge before sending the invite.');
        if (type === 'Manager' && !canAddManager) {
            return setError('Only the event owner can invite managers.');
        }

        const tickets = Object.entries(allotments)
            .filter(([, quantity]) => Number(quantity) > 0)
            .map(([event_ticket_id, quantity]) => ({ event_ticket_id, quantity: Number(quantity) }));

        if (needsAllotments && !tickets.length) {
            return setError('Add at least one ticket allotment.');
        }

        setBusy(true);
        try {
            await apiClient.managerAddHandler({
                event_id: eventId,
                eventId,
                type,
                email: email.trim().toLowerCase(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                scanner_permission: needsScannerPerm ? scannerPermission : undefined,
                commission_percentage: needsCommission ? commission : 0,
                verified: type === 'Ambassador' ? !ownAmbassador : false,
                tickets: needsAllotments ? tickets : undefined
            });
            toast.success('Team invite sent.');
            navigate(`/dashboard/events/${eventId}`, {
                replace: true,
                state: {
                    refreshHandlers: true,
                    eventId,
                    name: eventTitle
                }
            });
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not send invite.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="mx-auto max-w-2xl px-5 py-10 lg:px-8">
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50"
            >
                ← Overview
            </button>

            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Add team member</p>
            <h1 className="serif mt-2 text-5xl">{eventTitle}</h1>
            <p className="mt-3 text-sm text-ink/55">
                Invite a manager, gate staff, ambassador, or outlet. They accept from Requests / Invitations.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/45">Role</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {allowedTypes.map((row) => (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() => setType(row.id)}
                                className={`border px-4 py-3 text-left text-sm font-bold ${
                                    type === row.id ? 'border-coral bg-coral/10 text-coral' : 'border-ink/15 bg-white'
                                }`}
                            >
                                {row.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink/45">First name</span>
                        <input
                            required
                            className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-3"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Last name</span>
                        <input
                            className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-3"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </label>
                </div>

                <label className="block text-sm">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Email</span>
                    <input
                        required
                        type="email"
                        className="mt-2 w-full border border-ink/15 bg-transparent px-3 py-3"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teammate@email.com"
                    />
                </label>

                {needsScannerPerm ? (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink/45">Scanner permission</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {[
                                { id: 'scan_only', label: 'Scan only' },
                                { id: 'sell_only', label: 'Sell only' },
                                { id: 'both', label: 'Scan + Sell' }
                            ].map((row) => (
                                <button
                                    key={row.id}
                                    type="button"
                                    onClick={() => setScannerPermission(row.id)}
                                    className={`border px-3 py-3 text-xs font-extrabold uppercase tracking-wider ${
                                        scannerPermission === row.id
                                            ? 'border-coral bg-coral/10 text-coral'
                                            : 'border-ink/15'
                                    }`}
                                >
                                    {row.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {type === 'Ambassador' ? (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink/45">Ambassador path</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setOwnAmbassador(true)}
                                className={`border px-4 py-3 text-left text-sm ${
                                    ownAmbassador ? 'border-coral bg-coral/10' : 'border-ink/15'
                                }`}
                            >
                                <p className="font-bold">Add your own</p>
                                <p className="mt-1 text-ink/55">Manual invite · commission optional</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOwnAmbassador(false)}
                                className={`border px-4 py-3 text-left text-sm ${
                                    !ownAmbassador ? 'border-coral bg-coral/10' : 'border-ink/15'
                                }`}
                            >
                                <p className="font-bold">Verified network</p>
                                <p className="mt-1 text-ink/55">Prefill from verified ambassadors</p>
                            </button>
                        </div>
                        {!ownAmbassador ? (
                            <p className="mt-3 text-sm text-ink/55">
                                Verified network directory is not connected in this build — enter their email above and
                                mark as verified on submit.
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {needsCommission ? (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
                            Commission {!ownAmbassador ? '(required)' : '(optional)'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {COMMISSION_CHIPS.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setCommission(value)}
                                    className={`px-3 py-2 text-xs font-extrabold ${
                                        commission === value ? 'bg-ink text-white' : 'border border-ink/15'
                                    }`}
                                >
                                    {value}%
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {needsAllotments ? (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-ink/45">Ticket allotments</p>
                        <div className="mt-3 space-y-3">
                            {(ticketTypes || []).length ? (
                                ticketTypes.map((tier) => {
                                    const id = String(tier._id || tier.id);
                                    return (
                                        <div key={id} className="flex items-center justify-between gap-3 border border-ink/15 bg-white px-3 py-3">
                                            <div>
                                                <p className="font-bold">{tier.name}</p>
                                                <p className="text-xs text-ink/45">
                                                    {tier.remaining != null
                                                        ? `${tier.remaining} remaining`
                                                        : `${tier.sold || 0}/${tier.quantity || 0}`}
                                                </p>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-24 border border-ink/15 bg-transparent px-2 py-2 text-sm"
                                                value={allotments[id] || 0}
                                                onChange={(e) => setAllotment(id, e.target.value)}
                                            />
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-sm text-ink/55">No ticket types on this event yet.</p>
                            )}
                        </div>
                    </div>
                ) : null}

                <label className="flex items-start gap-3 text-sm text-ink/70">
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
                    <span>
                        I confirm this person should receive a {TYPES.find((row) => row.id === type)?.label || 'team'}{' '}
                        invite for this event.
                    </span>
                </label>

                {error ? <p className="text-sm text-coral">{error}</p> : null}

                <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-coral px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                >
                    {busy ? 'Sending…' : 'Send invite'}
                </button>
            </form>
        </main>
    );
}
