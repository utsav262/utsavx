import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Mail, Trash2 } from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrap } from '../../lib/unwrap.js';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';

const ROLE_LABELS = {
    Manager: 'Event Manager',
    Ambassador: 'Ticket Ambassador',
    Outlet: 'Ticket Outlet',
    Event_Scanner: 'Gate Staff'
};
const STATUS = { A: 'Accepted', P: 'Pending', D: 'Declined' };
const TEAM_KEY = { Manager: 'manager', Ambassador: 'ambassador', Outlet: 'outlet', Event_Scanner: 'scanner' };

export default function TeamMemberPage() {
    const { eventId, handlerId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [allotments, setAllotments] = useState({});
    const [commission, setCommission] = useState(0);
    const [permission, setPermission] = useState('scan_only');
    const [saving, setSaving] = useState(false);
    const [resending, setResending] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [removing, setRemoving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const data = unwrap(await apiClient.managerHandlerDetails(handlerId), null);
            setMember(data);
            const assigned = Object.fromEntries((data?.allotments || []).map((a) => [String(a.ticketTypeId), a.quantity]));
            setAllotments(
                Object.fromEntries((data?.event?.ticketTypes || []).map((t) => [String(t._id), assigned[String(t._id)] || 0]))
            );
            setCommission(Number(data?.commissionPercentage || 0));
            setPermission(data?.scannerPermission || 'scan_only');
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not load this team member.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [handlerId]);

    const backToEvent = (refresh = false) =>
        navigate(`/dashboard/events/${eventId}`, {
            replace: refresh,
            state: refresh
                ? {
                    eventId,
                    refreshTeamMemberType: TEAM_KEY[member?.userType],
                    refreshTeamMembersAt: Date.now(),
                    refreshOverviewAt: Date.now()
                }
                : undefined
        });

    const hasAllotments = member?.userType === 'Ambassador' || member?.userType === 'Outlet';
    const isScanner = member?.userType === 'Event_Scanner';
    const canManage = Boolean(member?.can_manage);

    const save = async () => {
        setSaving(true);
        try {
            await apiClient.managerUpdateHandler({
                id: handlerId,
                ...(hasAllotments
                    ? {
                        tickets: Object.entries(allotments)
                            .filter(([, qty]) => Number(qty) > 0)
                            .map(([event_ticket_id, quantity]) => ({ event_ticket_id, quantity: Number(quantity) }))
                    }
                    : {}),
                ...(member.userType === 'Ambassador' ? { commission_percentage: commission } : {}),
                ...(isScanner ? { scanner_permission: permission } : {})
            });
            toast.success('Team member updated.');
            await load();
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not save changes.');
        } finally {
            setSaving(false);
        }
    };

    const resend = async () => {
        setResending(true);
        try {
            const res = await apiClient.managerResendInvite(handlerId);
            toast.success(res.data?.message || 'Invitation resent.');
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not resend the invite.');
        } finally {
            setResending(false);
        }
    };

    const remove = async () => {
        setRemoving(true);
        try {
            await apiClient.managerDeleteHandler(handlerId);
            toast.success('Team member removed.');
            backToEvent(true);
        } catch (failure) {
            toast.error(failure.response?.data?.message || 'Could not remove this member.');
            setRemoving(false);
            setConfirmRemove(false);
        }
    };

    if (loading) {
        return (
            <main className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
                <div className="h-8 w-48 animate-pulse bg-ink/10" />
                <div className="mt-6 h-64 animate-pulse bg-ink/5" />
            </main>
        );
    }

    if (error || !member) {
        return (
            <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
                <p className="text-sm text-coral">{error || 'Team member not found.'}</p>
                <button type="button" onClick={() => backToEvent()} className="mt-6 bg-ink px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white">
                    Back to event
                </button>
            </main>
        );
    }

    const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
    const tickets = member.event?.ticketTypes || [];
    const soldByType = member.sales?.by_ticket_type || {};

    return (
        <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
            <button
                type="button"
                onClick={() => backToEvent()}
                className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
            >
                <ArrowLeft size={14} /> {member.event?.title || 'Event'}
            </button>

            <header className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-6">
                <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">
                        {ROLE_LABELS[member.userType] || member.userType}
                    </p>
                    <h1 className="serif mt-2 flex items-center gap-2 text-4xl">
                        {name}
                        {member.verified ? <BadgeCheck size={22} className="text-coral" aria-label="Verified" /> : null}
                    </h1>
                    <p className="mt-1 text-sm text-ink/55">{member.email}</p>
                </div>
                <span
                    className={`px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                        member.invitationStatus === 'A'
                            ? 'bg-emerald-100 text-emerald-700'
                            : member.invitationStatus === 'P'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-ink/10 text-ink/60'
                    }`}
                >
                    {STATUS[member.invitationStatus] || member.invitationStatus}
                </span>
            </header>

            {member.userType !== 'Event_Scanner' ? (
                <section className="mt-6 grid grid-cols-2 gap-3">
                    <div className="border border-ink/10 bg-white p-5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">Tickets sold</p>
                        <p className="serif mt-2 text-3xl">{member.sales?.tickets_sold || 0}</p>
                    </div>
                    <div className="border border-ink/10 bg-white p-5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">Gross sales</p>
                        <p className="serif mt-2 text-3xl">{money(member.sales?.gross || 0)}</p>
                    </div>
                </section>
            ) : null}

            {!canManage ? (
                <p className="mt-6 border border-ink/10 bg-cream px-4 py-3 text-sm text-ink/60">
                    Only the event owner can change or remove Event Managers.
                </p>
            ) : (
                <>
                    {hasAllotments ? (
                        <section className="mt-6 border border-ink/10 bg-white p-5">
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">Assigned tickets</h2>
                            <ul className="mt-4 divide-y divide-ink/10">
                                {tickets.map((tier) => {
                                    const id = String(tier._id);
                                    return (
                                        <li key={id} className="flex items-center justify-between gap-4 py-3 text-sm">
                                            <div>
                                                <p className="font-bold">{tier.name}</p>
                                                <p className="text-xs text-ink/45">
                                                    {money(tier.price)} · {soldByType[id] || 0} sold by them
                                                </p>
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                max={tier.quantity || undefined}
                                                value={allotments[id] ?? 0}
                                                onChange={(e) =>
                                                    setAllotments((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                                                }
                                                aria-label={`${tier.name} assigned quantity`}
                                                className="w-24 border border-ink/20 px-3 py-2 text-right"
                                            />
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ) : null}

                    {member.userType === 'Ambassador' ? (
                        <section className="mt-4 border border-ink/10 bg-white p-5">
                            <label className="flex items-center justify-between gap-4 text-sm">
                                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">Commission %</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={commission}
                                    onChange={(e) => setCommission(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                                    className="w-24 border border-ink/20 px-3 py-2 text-right"
                                />
                            </label>
                        </section>
                    ) : null}

                    {isScanner ? (
                        <section className="mt-6 border border-ink/10 bg-white p-5">
                            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">Gate permission</h2>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {[
                                    ['scan_only', 'Scan only'],
                                    ['sell_only', 'Sell only'],
                                    ['both', 'Scan & sell']
                                ].map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setPermission(value)}
                                        className={`border px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider ${
                                            permission === value ? 'border-coral bg-coral/10 text-coral' : 'border-ink/15'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <div className="mt-6 flex flex-wrap gap-2">
                        {hasAllotments || isScanner || member.userType === 'Ambassador' ? (
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving}
                                className="bg-coral px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                            >
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        ) : null}
                        {member.invitationStatus === 'P' ? (
                            <button
                                type="button"
                                onClick={resend}
                                disabled={resending}
                                className="inline-flex items-center gap-2 border border-ink/15 px-5 py-3 text-xs font-extrabold uppercase tracking-wider disabled:opacity-60"
                            >
                                <Mail size={14} /> {resending ? 'Sending…' : 'Resend invite'}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setConfirmRemove(true)}
                            className="ml-auto inline-flex items-center gap-2 border border-red-200 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={14} /> Remove
                        </button>
                    </div>
                </>
            )}

            {confirmRemove ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => !removing && setConfirmRemove(false)}>
                    <div className="w-full max-w-sm bg-white p-6" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <h3 className="serif text-2xl">Remove {name}?</h3>
                        <p className="mt-2 text-sm text-ink/60">
                            They lose access to this event immediately. Sales they already made are kept.
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setConfirmRemove(false)} disabled={removing} className="border border-ink/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider">
                                Cancel
                            </button>
                            <button type="button" onClick={remove} disabled={removing} className="bg-red-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60">
                                {removing ? 'Removing…' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
