import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiClient } from '../../api/index.js';
import { unwrap } from '../../lib/unwrap.js';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { isOwnerLike } from '../dashboard/dashboardUtils.js';
import {
    buildSellPayload,
    filterTicketsForMode,
    maxQtyForMode,
    unitPriceForMode
} from './sellUtils.js';

const STEPS = ['tickets', 'registration', 'payment'];

export default function SellFlow() {
    const { eventId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const user = useSelector((state) => state.auth.user);

    const seed = location.state || {};
    const mode = seed.mode || 'digital';
    const eventItem = seed.eventItem || null;
    const ownerLike = isOwnerLike(eventItem) || user?.role === 'organizer' || user?.role === 'admin';

    const [step, setStep] = useState('tickets');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [catalog, setCatalog] = useState(null);
    const [qtyById, setQtyById] = useState({});
    const [attendees, setAttendees] = useState([]);
    const [gateSuccess, setGateSuccess] = useState(null);

    const loadTickets = async () => {
        setLoading(true);
        setError('');
        try {
            let payload;
            if (ownerLike) {
                const response = await apiClient.managerTickets(eventId);
                const tiers = unwrap(response, []);
                const list = Array.isArray(tiers) ? tiers : [];
                payload = {
                    event: eventItem || { _id: eventId, title: seed.name },
                    tickets: list.map((tier) => ({
                        _id: tier._id,
                        id: tier._id,
                        name: tier.name,
                        price: tier.price,
                        door_price: tier.price,
                        quantity: tier.quantity,
                        sold: tier.sold || 0,
                        remaining: Math.max(0, Number(tier.quantity || 0) - Number(tier.sold || 0)),
                        salesStatus: tier.salesStatus,
                        is_complimentary: /complimentary/i.test(String(tier.name || '')) || Number(tier.price) === 0
                    }))
                };
            } else {
                const response = await apiClient.staffSellableTickets(eventId);
                payload = unwrap(response, null);
            }
            setCatalog(payload);
            setQtyById({});
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not load tickets for sale.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, [eventId, ownerLike]);

    const tiers = useMemo(
        () => filterTicketsForMode(catalog?.tickets || [], mode),
        [catalog, mode]
    );

    const selections = useMemo(() => {
        return tiers
            .map((tier) => {
                const id = String(tier._id || tier.id);
                const qty = Number(qtyById[id] || 0);
                if (!qty) return null;
                return {
                    ticketId: tier._id || tier.id,
                    name: tier.name,
                    qty,
                    unitPrice: unitPriceForMode(tier, mode)
                };
            })
            .filter(Boolean);
    }, [tiers, qtyById, mode]);

    const totalTickets = selections.reduce((sum, row) => sum + row.qty, 0);
    const totalAmount = selections.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);

    const setQty = (tier, next) => {
        const id = String(tier._id || tier.id);
        const max = maxQtyForMode(tier, mode);
        const value = Math.max(0, Math.min(max, Number(next) || 0));
        setQtyById((prev) => ({ ...prev, [id]: value }));
    };

    const goCheckout = () => {
        if (!totalTickets) {
            setError('Select at least one ticket.');
            return;
        }
        setError('');
        if (mode === 'gate') {
            const guests = Array.from({ length: totalTickets }, () => ({
                first_name: 'Gate',
                last_name: 'Guest',
                delivery_method: 'email',
                email: '',
                phone: ''
            }));
            setAttendees(guests);
            setStep('payment');
            return;
        }
        setAttendees(
            Array.from({ length: totalTickets }, (_, index) => attendees[index] || {
                first_name: '',
                last_name: '',
                delivery_method: 'email',
                email: '',
                phone: ''
            })
        );
        setStep('registration');
    };

    const updateAttendee = (index, patch) => {
        setAttendees((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    };

    const confirmSale = async () => {
        if (mode !== 'gate') {
            const invalid = attendees.some((row) => !String(row.first_name || '').trim());
            if (invalid) {
                setError('Each attendee needs a first name.');
                return;
            }
        }
        setBusy(true);
        setError('');
        try {
            const payload = buildSellPayload({
                eventId,
                mode,
                selections,
                attendees
            });
            const response = ownerLike
                ? await apiClient.sellTicketOrders(payload)
                : await apiClient.staffSellTicketOrders(payload);
            const message = response.data?.message || 'Tickets sold successfully';
            if (mode === 'gate') {
                setGateSuccess({
                    message,
                    result: unwrap(response, null)
                });
            } else {
                toast.success(message);
                navigate('/dashboard', { replace: true });
            }
        } catch (failure) {
            setError(failure.response?.data?.message || 'Sale could not be completed.');
        } finally {
            setBusy(false);
        }
    };

    const modeLabel =
        mode === 'gate' ? 'Gate ticket' : mode === 'complimentary' ? 'Complimentary' : 'Digital ticket';

    return (
        <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
            <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-[11px] font-extrabold uppercase tracking-wider text-ink/50"
            >
                ← Dashboard
            </button>

            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">{modeLabel}</p>
            <h1 className="serif mt-2 text-5xl">{catalog?.event?.title || eventItem?.title || 'Sell tickets'}</h1>

            <div className="mt-6 flex gap-2">
                {STEPS.filter((id) => !(mode === 'gate' && id === 'registration')).map((id) => (
                    <span
                        key={id}
                        className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            step === id ? 'bg-ink text-white' : 'border border-ink/15 text-ink/45'
                        }`}
                    >
                        {id}
                    </span>
                ))}
            </div>

            {error ? (
                <div className="mt-5 border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
            ) : null}

            {loading ? <p className="mt-10 text-sm text-ink/50">Loading tickets…</p> : null}

            {!loading && step === 'tickets' ? (
                <section className="mt-8 space-y-4">
                    {!tiers.length ? (
                        <p className="border border-dashed border-ink/20 px-4 py-10 text-center text-sm text-ink/55">
                            No ticket types available for this sell mode.
                        </p>
                    ) : (
                        tiers.map((tier) => {
                            const id = String(tier._id || tier.id);
                            const qty = Number(qtyById[id] || 0);
                            const max = maxQtyForMode(tier, mode);
                            const price = unitPriceForMode(tier, mode);
                            return (
                                <div key={id} className="flex items-center justify-between gap-4 border border-ink/15 bg-white p-4">
                                    <div>
                                        <p className="font-bold">{tier.name}</p>
                                        <p className="mt-1 text-sm text-ink/55">
                                            {money(price)}
                                            {mode === 'gate' ? ' door' : ''}
                                            {mode !== 'gate' ? ` · ${tier.remaining ?? max} left` : ' · up to 20'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="border border-ink/15 px-3 py-2"
                                            onClick={() => setQty(tier, qty - 1)}
                                        >
                                            −
                                        </button>
                                        <span className="w-8 text-center font-bold">{qty}</span>
                                        <button
                                            type="button"
                                            className="border border-ink/15 px-3 py-2"
                                            onClick={() => setQty(tier, qty + 1)}
                                            disabled={qty >= max}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <div className="flex items-center justify-between border-t border-ink/10 pt-4">
                        <p className="text-sm text-ink/60">
                            {totalTickets} ticket{totalTickets === 1 ? '' : 's'} · {money(totalAmount)}
                        </p>
                        <button
                            type="button"
                            onClick={goCheckout}
                            className="bg-coral px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                        >
                            Check out
                        </button>
                    </div>
                </section>
            ) : null}

            {!loading && step === 'registration' ? (
                <section className="mt-8 space-y-4">
                    <p className="text-sm text-ink/55">One attendee slot per ticket. Fees / commission preview uses cash total.</p>
                    {attendees.map((person, index) => (
                        <div key={index} className="border border-ink/15 bg-white p-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">
                                Attendee {index + 1}
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <input
                                    required
                                    className="border border-ink/15 bg-transparent px-3 py-2.5 text-sm"
                                    placeholder="First name"
                                    value={person.first_name}
                                    onChange={(e) => updateAttendee(index, { first_name: e.target.value })}
                                />
                                <input
                                    className="border border-ink/15 bg-transparent px-3 py-2.5 text-sm"
                                    placeholder="Last name"
                                    value={person.last_name}
                                    onChange={(e) => updateAttendee(index, { last_name: e.target.value })}
                                />
                                <select
                                    className="border border-ink/15 bg-transparent px-3 py-2.5 text-sm"
                                    value={person.delivery_method}
                                    onChange={(e) => updateAttendee(index, { delivery_method: e.target.value })}
                                >
                                    <option value="email">Email</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="sms">SMS</option>
                                </select>
                                <input
                                    className="border border-ink/15 bg-transparent px-3 py-2.5 text-sm"
                                    placeholder={person.delivery_method === 'email' ? 'Email' : 'Phone'}
                                    value={person.delivery_method === 'email' ? person.email : person.phone}
                                    onChange={(e) =>
                                        updateAttendee(
                                            index,
                                            person.delivery_method === 'email'
                                                ? { email: e.target.value }
                                                : { phone: e.target.value }
                                        )
                                    }
                                />
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between gap-3 border-t border-ink/10 pt-4">
                        <button
                            type="button"
                            onClick={() => setStep('tickets')}
                            className="border border-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-wider"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                setStep('payment');
                            }}
                            className="bg-coral px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                        >
                            Pay now
                        </button>
                    </div>
                    <p className="text-sm text-ink/55">Buyer total preview: {money(totalAmount)}</p>
                </section>
            ) : null}

            {!loading && step === 'payment' ? (
                <section className="mt-8 border border-ink/15 bg-white p-6">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Confirm cash sale</p>
                    <h2 className="serif mt-3 text-3xl">Collect {money(totalAmount)}</h2>
                    <ul className="mt-5 space-y-2 text-sm text-ink/65">
                        {selections.map((row) => (
                            <li key={row.ticketId} className="flex justify-between gap-3">
                                <span>
                                    {row.qty} × {row.name}
                                </span>
                                <span className="font-bold">{money(row.qty * row.unitPrice)}</span>
                            </li>
                        ))}
                    </ul>
                    {mode === 'gate' ? (
                        <p className="mt-4 text-sm text-ink/55">Gate sale — registration skipped for door guests.</p>
                    ) : null}
                    <div className="mt-8 flex justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setStep(mode === 'gate' ? 'tickets' : 'registration')}
                            className="border border-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-wider"
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={confirmSale}
                            className="bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                        >
                            {busy ? 'Confirming…' : 'Confirm sale'}
                        </button>
                    </div>
                </section>
            ) : null}

            {gateSuccess ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4">
                    <div className="w-full max-w-md border border-ink/10 bg-cream p-6">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-coral">Gate sale complete</p>
                        <h2 className="serif mt-2 text-3xl">Tickets issued</h2>
                        <p className="mt-3 text-sm text-ink/55">{gateSuccess.message}</p>
                        <div className="mt-6 grid gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setGateSuccess(null);
                                    setStep('tickets');
                                    setQtyById({});
                                    setAttendees([]);
                                    loadTickets();
                                }}
                                className="bg-coral px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white"
                            >
                                Sell another
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard', { replace: true })}
                                className="border border-ink/15 px-4 py-3 text-xs font-extrabold uppercase tracking-wider"
                            >
                                Done → Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
