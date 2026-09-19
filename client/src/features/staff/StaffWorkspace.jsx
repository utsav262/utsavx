import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../../store/index.js';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import { eventIdOf } from './staffHelpers.jsx';
import StaffOverview from './StaffOverview.jsx';
import StaffEvents from './StaffEvents.jsx';
import StaffInvites from './StaffInvites.jsx';
import StaffCheckIn from './StaffCheckIn.jsx';
import StaffEventDashboard from './StaffEventDashboard.jsx';

const SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: 'Your catalog' },
    { id: 'invites', label: 'Invitations' },
    { id: 'checkin', label: 'Check-in' }
];

export default function StaffWorkspace() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const [section, setSection] = useState('overview');
    const [invites, setInvites] = useState([]);
    const [activeInvite, setActiveInvite] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busyId, setBusyId] = useState('');
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        try {
            const response = await apiClient.me();
            const profile = unwrap(response, null);
            if (profile) {
                dispatch(setUser({ user: profile, token: localStorage.getItem('utsavx_token') }));
            }
        } catch {
            /* keep existing session */
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const response = await apiClient.myInvitations();
            setInvites(unwrapList(response));
            setError('');
        } catch (failure) {
            setError(failure.response?.data?.message || 'Could not load staff workspace.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        refreshProfile();
    }, []);

    const pending = useMemo(() => invites.filter((row) => row.invitationStatus === 'P'), [invites]);
    const accepted = useMemo(() => invites.filter((row) => row.invitationStatus === 'A'), [invites]);
    const declined = useMemo(() => invites.filter((row) => row.invitationStatus === 'D'), [invites]);

    useEffect(() => {
        if (!activeInvite) return;
        const stillThere = accepted.find((row) => row._id === activeInvite._id);
        if (stillThere) setActiveInvite(stillThere);
    }, [accepted, activeInvite]);

    const respond = async (id, action) => {
        setBusyId(id);
        setNotice('');
        try {
            if (action === 'accept') await apiClient.acceptInvitation(id);
            else await apiClient.rejectInvitation(id);
            setNotice(
                action === 'accept'
                    ? 'Invitation accepted. Opening your dashboard catalog…'
                    : 'Invitation declined.'
            );
            await Promise.all([load(), refreshProfile()]);
            if (action === 'accept') {
                navigate('/dashboard', { replace: true, state: { refreshEvents: true } });
                return;
            }
        } catch (failure) {
            setNotice(failure.response?.data?.message || 'Could not update invitation.');
        } finally {
            setBusyId('');
        }
    };

    const openDashboard = async (invite) => {
        const permissions = invite.permissions || {};
        if (permissions.canViewDashboard === false) {
            setNotice('Dashboard access is not available for this handler role.');
            return;
        }
        const id = eventIdOf(invite);
        navigate(`/dashboard/events/${id}`, {
            state: {
                eventId: id,
                eventItem: {
                    ...(invite.event || {}),
                    is_owner: false,
                    event_handler_type: invite.userType,
                    scanner_permission: invite.scannerPermission,
                    event_handler_id: invite._id
                },
                name: invite.event?.title,
                role: invite.userType
            }
        });
    };

    const openCheckIn = (invite) => {
        const target = invite || activeInvite;
        if (!target) {
            setSection('events');
            return;
        }
        if (target.permissions && target.permissions.canCheckIn === false) {
            setNotice('Check-in is not included in this handler role.');
            return;
        }
        setActiveInvite(target);
        setSection('checkin');
        setNotice('');
    };

    const nextEvent = accepted.find((row) => row.permissions?.canCheckIn || row.canScan) || accepted[0] || null;

    return (
        <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
            {section !== 'dashboard' ? (
                <div className="flex flex-col justify-between gap-5 border-b border-ink/15 pb-8 md:flex-row md:items-end">
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral">
                            {user?.staffRoleLabel || 'Staff workspace'}
                        </p>
                        <h1 className="serif mt-2 text-5xl sm:text-6xl">Staff desk</h1>
                        <p className="mt-3 max-w-xl text-sm text-ink/60">
                            Accept invites, open your catalog, and use the dashboard your handler role allows.
                        </p>
                    </div>
                    {user?.staffRoleLabel ? (
                        <span className="inline-flex self-start bg-moss/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-moss md:self-auto">
                            Role · {user.staffRoleLabel}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {section !== 'dashboard' ? (
                <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-ink/10 pb-px" aria-label="Staff sections">
                    {SECTIONS.map((item) => {
                        const active = section === item.id;
                        const badge =
                            item.id === 'invites' && pending.length
                                ? pending.length
                                : item.id === 'events' && accepted.length
                                    ? accepted.length
                                    : null;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setSection(item.id)}
                                className={`shrink-0 border-b-2 px-4 py-3 text-xs font-extrabold uppercase tracking-wider transition ${
                                    active
                                        ? 'border-coral text-ink'
                                        : 'border-transparent text-ink/45 hover:text-ink/70'
                                }`}
                            >
                                {item.label}
                                {badge ? (
                                    <span className="ml-2 inline-flex min-w-[1.25rem] justify-center bg-coral px-1.5 py-0.5 text-[10px] text-white">
                                        {badge}
                                    </span>
                                ) : null}
                            </button>
                        );
                    })}
                </nav>
            ) : null}

            {error ? (
                <div className="mt-5 border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
            ) : null}
            {notice ? (
                <div className="mt-5 border border-moss/25 bg-moss/10 px-4 py-3 text-sm text-moss">{notice}</div>
            ) : null}

            <div className={section === 'dashboard' ? 'mt-2' : 'mt-10'}>
                {loading ? (
                    <p className="text-sm text-ink/50">Loading staff workspace…</p>
                ) : null}

                {!loading && section === 'overview' ? (
                    <StaffOverview
                        user={user}
                        pendingCount={pending.length}
                        acceptedCount={accepted.length}
                        declinedCount={declined.length}
                        nextEvent={nextEvent}
                        onGo={setSection}
                        onOpenCheckIn={openCheckIn}
                        onOpenDashboard={openDashboard}
                    />
                ) : null}

                {!loading && section === 'events' ? (
                    <StaffEvents
                        accepted={accepted}
                        selectedId={activeInvite?._id}
                        onOpenDashboard={openDashboard}
                    />
                ) : null}

                {!loading && section === 'invites' ? (
                    <StaffInvites
                        pending={pending}
                        declined={declined}
                        busyId={busyId}
                        onRespond={respond}
                    />
                ) : null}

                {!loading && section === 'dashboard' ? (
                    <StaffEventDashboard
                        invite={activeInvite}
                        dashboard={dashboard}
                        loading={dashboardLoading}
                        onBack={() => setSection('events')}
                        onOpenCheckIn={openCheckIn}
                    />
                ) : null}

                {!loading && section === 'checkin' ? (
                    <StaffCheckIn
                        invite={activeInvite || nextEvent}
                        onNotice={setNotice}
                        onBack={() => setSection(activeInvite ? 'dashboard' : 'events')}
                    />
                ) : null}
            </div>
        </main>
    );
}
