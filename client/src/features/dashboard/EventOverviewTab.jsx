import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import QRCode from 'qrcode';
import {
    BadgeCheck, ChevronDown, Crown, Download, Eye, Heart, Link2,
    Megaphone, Plus, Share2, UserRound, Users, X
} from 'lucide-react';
import { apiClient } from '../../api/index.js';
import { unwrap, unwrapList } from '../../lib/unwrap.js';
import { money } from '../../lib/money.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { isEventManager, isEventOwner, isEventScanner } from './dashboardUtils.js';

/* ---------------- config ---------------- */

const TEAM_TYPES = [
    { type: 'manager', apiType: 'Manager', title: 'Event Managers', empty: 'No event managers yet.' },
    { type: 'ambassador', apiType: 'Ambassador', title: 'Ticket Ambassadors', empty: 'No ticket ambassadors yet.' },
    { type: 'outlet', apiType: 'Outlet', title: 'Ticket Outlets', empty: 'No ticket outlets yet.' },
    { type: 'scanner', apiType: 'Event_Scanner', title: 'Gate Staff', empty: 'No gate staff yet.' }
];

const BOOST_BULLETS = [
    'Feature your event on the MXO homepage and emails',
    'Retarget confirmed ticket buyers for similar events',
    'Priority placement in "Recommended" search results'
];

const emptyTeam = () => ({ items: [], loading: false, loaded: false, expanded: false });
const emptyTeams = () => Object.fromEntries(TEAM_TYPES.map(({ type }) => [type, emptyTeam()]));

/* ---------------- permissions ---------------- */

/** owner → Manager (handler type, or accepted in the managers list) → Event_Scanner → null. */
export function resolveOverviewRole(event, user, managers = []) {
    if (isEventOwner(event)) return 'owner';
    if (isEventManager(event)) return 'Manager';
    const email = String(user?.email || '').toLowerCase();
    const isAcceptedManager = managers.some(
        (m) =>
            (m.invitationStatus || m.status) === 'A' &&
            (String(m.user || '') === String(user?._id || '') || String(m.email || '').toLowerCase() === email)
    );
    if (email && isAcceptedManager) return 'Manager';
    if (isEventScanner(event)) return 'Event_Scanner';
    return null;
}

export function canAddMember(role, type) {
    if (role === 'owner') return true;
    if (role === 'Manager') return type !== 'manager';
    return false;
}

/* ---------------- small pieces ---------------- */

function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-ink/10 ${className}`} />;
}

function Card({ children, className = '' }) {
    return <section className={`border border-ink/10 bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

function CardTitle({ children, Icon }) {
    return (
        <h3 className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/55">
            {Icon ? <Icon size={14} className="text-coral" /> : null}
            {children}
        </h3>
    );
}

function memberName(member) {
    return [member.firstName, member.lastName].filter(Boolean).join(' ') || member.name || member.email || 'Member';
}

function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function Avatar({ member, onClick }) {
    const name = memberName(member);
    const pending = !member.isOwner && (member.invitationStatus || member.status) === 'P';
    const ring = member.isOwner
        ? 'ring-4 ring-butter'
        : member.verified
            ? 'ring-4 ring-coral'
            : 'ring-2 ring-ink/10';
    return (
        <button type="button" onClick={onClick} className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center">
            <span className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-cream text-sm font-extrabold ${ring} ${pending ? 'opacity-50' : ''}`}>
                {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                    initials(name)
                )}
                {member.isOwner ? (
                    <Crown size={16} className="absolute -top-3 left-1/2 -translate-x-1/2 fill-butter text-amber-600" aria-label="Owner" />
                ) : null}
                {member.verified && !member.isOwner ? (
                    <BadgeCheck size={16} className="absolute -bottom-1 -right-1 bg-white text-coral" aria-label="Verified" />
                ) : null}
            </span>
            <span className="w-full truncate text-xs font-bold group-hover:text-coral">{name}</span>
            {pending ? (
                <span className="bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
                    Pending
                </span>
            ) : null}
        </button>
    );
}

function TeamSection({ config, state, canAdd, onToggle, onAdd, onOpenMember }) {
    return (
        <Card className="p-0 sm:p-0">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={state.expanded}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6"
            >
                <span className="flex items-center gap-2">
                    <Users size={15} className="text-coral" />
                    <span className="serif text-xl">{config.title}</span>
                    {state.loaded ? <span className="text-xs font-bold text-ink/40">{state.items.length}</span> : null}
                </span>
                <ChevronDown size={18} className={`text-ink/50 transition ${state.expanded ? 'rotate-180' : ''}`} />
            </button>

            {state.expanded ? (
                <div className="border-t border-ink/10 px-5 py-5 sm:px-6">
                    {state.loading ? (
                        <div className="flex gap-4 overflow-hidden">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex w-20 flex-col items-center gap-2">
                                    <Skeleton className="h-14 w-14 rounded-full" />
                                    <Skeleton className="h-3 w-14" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {!state.items.length ? (
                                <div className="mb-4 flex items-center gap-3 text-sm text-ink/50">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream">
                                        <UserRound size={20} className="text-ink/30" />
                                    </span>
                                    {config.empty}
                                </div>
                            ) : null}
                            <div className="flex gap-4 overflow-x-auto pb-2 pt-3">
                                {state.items.map((member) => (
                                    <Avatar
                                        key={member._id || member.email}
                                        member={member}
                                        onClick={() => onOpenMember(member, config.type)}
                                    />
                                ))}
                                {canAdd ? (
                                    <button
                                        type="button"
                                        onClick={onAdd}
                                        className="flex w-20 shrink-0 flex-col items-center gap-2 text-center"
                                    >
                                        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-ink/25 text-ink/50 transition hover:border-coral hover:text-coral">
                                            <Plus size={20} />
                                        </span>
                                        <span className="text-xs font-bold text-ink/60">Add Member</span>
                                    </button>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>
            ) : null}
        </Card>
    );
}

function MemberDialog({ member, onClose }) {
    if (!member) return null;
    const status = member.isOwner ? 'Owner' : { A: 'Accepted', P: 'Pending', D: 'Declined' }[member.invitationStatus || member.status];
    const rows = [
        ['Email', member.email],
        ['Role', member.isOwner ? 'Owner' : member.userType || member.type],
        ['Status', status],
        ['Scanner permission', member.scannerPermission && member.userType === 'Event_Scanner' ? member.scannerPermission.replace('_', ' ') : null],
        ['Commission', member.commissionPercentage ? `${member.commissionPercentage}%` : null],
        ['Assigned tickets', member.allotments?.length ? member.allotments.reduce((s, a) => s + Number(a.quantity || 0), 0) : null]
    ].filter(([, value]) => value);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
            <div className="w-full max-w-sm bg-white p-6" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <h3 className="serif text-2xl">{memberName(member)}</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-ink/50 hover:text-ink">
                        <X size={18} />
                    </button>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-ink/10 pb-2">
                            <dt className="text-ink/50">{label}</dt>
                            <dd className="text-right font-bold">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}

/* ---------------- main ---------------- */

export default function EventOverviewTab({
    eventId,
    eventName,
    event: eventProp,
    refreshTeamMemberType,
    refreshTeamMembersAt,
    refreshOverviewAt
}) {
    const navigate = useNavigate();
    const toast = useToast();
    const user = useSelector((s) => s.auth.user);

    const [event, setEvent] = useState(eventProp || null);
    const [eventLoading, setEventLoading] = useState(true);
    const [finance, setFinance] = useState(null);
    const [financeLoading, setFinanceLoading] = useState(true);
    const [teams, setTeams] = useState(emptyTeams);
    const [member, setMember] = useState(null);
    const [qrBusy, setQrBusy] = useState(false);

    const teamsRef = useRef(teams);
    teamsRef.current = teams;
    const lastTeamRefreshRef = useRef(null);
    const cacheRef = useRef({ eventId: null });

    const title = event?.title || event?.name || eventName || 'Event';
    const currency = event?.ticketTypes?.[0]?.currency || 'INR';
    const publicUrl = useMemo(() => {
        const slug = event?.slug || eventId;
        return slug ? `${window.location.origin}/events/${slug}` : '';
    }, [event?.slug, eventId]);

    /* ----- event + ticket orders ----- */
    const loadOverview = useCallback(async (force = false) => {
        if (!eventId) return;
        if (!force && cacheRef.current.eventId === eventId) return;
        cacheRef.current.eventId = eventId;

        setEventLoading(true);
        setFinanceLoading(true);
        apiClient.managerEvent(eventId)
            .then((res) => {
                const full = unwrap(res, null);
                if (full && !Array.isArray(full)) setEvent((prev) => ({ ...(prev || {}), ...full }));
            })
            .catch(() => {})
            .finally(() => setEventLoading(false));

        try {
            const [orders, overview, payouts] = await Promise.all([
                apiClient.managerOrders(eventId, { type: 'summary' }),
                apiClient.managerSalesOverview(eventId),
                apiClient.managerPayouts(eventId)
            ]);
            setFinance({
                orders: unwrap(orders, {}) || {},
                overview: unwrap(overview, {}) || {},
                payouts: unwrap(payouts, {}) || {}
            });
        } catch {
            setFinance({ orders: {}, overview: {}, payouts: {} });
        } finally {
            setFinanceLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadOverview(Boolean(refreshOverviewAt));
    }, [loadOverview, refreshOverviewAt]);

    /* ----- team lists ----- */
    useEffect(() => {
        setTeams(emptyTeams());
        lastTeamRefreshRef.current = null;
    }, [eventId]);

    const fetchEventHandlers = useCallback(async (type, { force = false, expand = false } = {}) => {
        const config = TEAM_TYPES.find((t) => t.type === type);
        const current = teamsRef.current[type];
        if (!config || !eventId || current.loading || (current.loaded && !force)) {
            if (expand) setTeams((prev) => ({ ...prev, [type]: { ...prev[type], expanded: true } }));
            return;
        }
        setTeams((prev) => ({
            ...prev,
            [type]: { ...prev[type], loading: true, expanded: expand || prev[type].expanded }
        }));
        try {
            const rows = unwrapList(await apiClient.managerHandlers(eventId, config.apiType));
            setTeams((prev) => ({ ...prev, [type]: { ...prev[type], items: rows, loading: false, loaded: true } }));
        } catch {
            setTeams((prev) => ({ ...prev, [type]: { ...prev[type], loading: false, loaded: true } }));
            toast.error(`Could not load ${config.title.toLowerCase()}.`);
        }
    }, [eventId, toast]);

    const toggleSection = (type) => {
        const current = teamsRef.current[type];
        if (!current.expanded && !current.loaded) {
            fetchEventHandlers(type, { expand: true });
            return;
        }
        setTeams((prev) => ({ ...prev, [type]: { ...prev[type], expanded: !prev[type].expanded } }));
    };

    // Coming back from Add Team Member: force-refetch that type once and open it.
    useEffect(() => {
        if (!refreshTeamMemberType || !refreshTeamMembersAt) return;
        if (lastTeamRefreshRef.current === refreshTeamMembersAt) return;
        lastTeamRefreshRef.current = refreshTeamMembersAt;
        const key = String(refreshTeamMemberType).toLowerCase().includes('scanner')
            ? 'scanner'
            : String(refreshTeamMemberType).toLowerCase();
        fetchEventHandlers(key, { force: true, expand: true });
    }, [refreshTeamMemberType, refreshTeamMembersAt, fetchEventHandlers]);

    /* ----- permissions ----- */
    const role = resolveOverviewRole(event, user, teams.manager.items);

    const owner = useMemo(() => {
        const org = event?.organizer;
        if (!org || typeof org !== 'object') return null;
        return { _id: `owner-${org._id}`, name: org.name, email: org.email, avatarUrl: org.avatarUrl, isOwner: true };
    }, [event?.organizer]);

    const itemsFor = (type) => (type === 'manager' && owner ? [owner, ...teams.manager.items] : teams[type].items);

    const openAddMember = (type) => {
        const config = TEAM_TYPES.find((t) => t.type === type);
        navigate(`/dashboard/events/${eventId}/team/add`, {
            state: {
                type: config.apiType,
                eventId,
                eventName: title,
                eventTitle: title,
                eventLocation: [event?.venue?.name, event?.venue?.city].filter(Boolean).join(', '),
                event,
                ticketTypes: event?.ticketTypes || []
            }
        });
    };

    /* ----- link / share / QR ----- */
    const openLink = () => {
        if (!publicUrl) return toast.error('Event link is missing.');
        const win = window.open(publicUrl, '_blank', 'noopener');
        if (!win) toast.error('Unable to open link');
    };

    const shareLink = async () => {
        if (!publicUrl) return toast.error('Event link is missing.');
        try {
            if (navigator.share) {
                await navigator.share({ title, url: publicUrl });
            } else {
                await navigator.clipboard.writeText(publicUrl);
                toast.success('Link copied to clipboard.');
            }
        } catch (error) {
            if (error?.name !== 'AbortError') toast.error('Unable to share right now.');
        }
    };

    const downloadQr = async () => {
        if (!eventId) return toast.error('Event id is missing.');
        if (!publicUrl) return toast.error('Event link is missing.');
        if (qrBusy) return toast.error('QR is not ready yet');
        setQrBusy(true);
        try {
            const dataUrl = await QRCode.toDataURL(publicUrl, { width: 1024, margin: 2 });
            const fileName = `${(event?.slug || eventId).toString().replace(/[^a-z0-9-]+/gi, '-')}-qr.png`;
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(`${fileName} downloaded.`);
        } catch {
            toast.error('Unable to generate QR image');
        } finally {
            setQrBusy(false);
        }
    };

    /* ----- derived numbers ----- */
    const gross = finance?.payouts?.gross ?? finance?.orders?.gross_sales ?? 0;
    const earnings = finance?.payouts?.payout_due ?? 0;
    const soldTotal = finance?.overview?.tickets_sold ?? 0;
    const soldBy = finance?.overview?.sold_by || {};
    const teamSold = Number(soldBy.manager || 0) + Number(soldBy.ambassador || 0) + Number(soldBy.outlet || 0);
    const boostActive = Boolean(event?.featured);

    return (
        <div className="space-y-6">
            {/* Financial summary */}
            <div className="grid gap-4 sm:grid-cols-2">
                {financeLoading ? (
                    <>
                        <Skeleton className="h-28" />
                        <Skeleton className="h-28" />
                    </>
                ) : (
                    <>
                        <Card>
                            <CardTitle>Gross Sales</CardTitle>
                            <p className="serif mt-3 text-4xl">{money(gross, currency)}</p>
                        </Card>
                        <Card>
                            <CardTitle>Earnings</CardTitle>
                            <p className="serif mt-3 text-4xl">{money(earnings, currency)}</p>
                        </Card>
                    </>
                )}
            </div>

            {/* Tickets sold */}
            {financeLoading ? (
                <Skeleton className="h-32" />
            ) : (
                <Card>
                    <CardTitle>Tickets sold</CardTitle>
                    <p className="serif mt-3 text-5xl">{soldTotal}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        {[
                            ['By team', teamSold],
                            ['Managers', soldBy.manager || 0],
                            ['Ambassadors', soldBy.ambassador || 0],
                            ['Outlets', soldBy.outlet || 0]
                        ].map(([label, value]) => (
                            <div key={label} className="bg-cream px-3 py-2">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">{label}</p>
                                <p className="mt-1 font-extrabold">{value}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Team */}
            <div className="space-y-3">
                {TEAM_TYPES.map((config) => (
                    <TeamSection
                        key={config.type}
                        config={config}
                        state={{ ...teams[config.type], items: itemsFor(config.type) }}
                        canAdd={canAddMember(role, config.type)}
                        onToggle={() => toggleSection(config.type)}
                        onAdd={() => openAddMember(config.type)}
                        onOpenMember={(m) => (m.isOwner ? setMember(m) : navigate(`/dashboard/events/${eventId}/team/${m._id}`))}
                    />
                ))}
            </div>

            {/* Insights */}
            {eventLoading && !event ? (
                <Skeleton className="h-28" />
            ) : (
                <Card>
                    <CardTitle>Event Insights</CardTitle>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        {[
                            ['Page Visits', event?.pageViews, Eye],
                            ['Event Likes', event?.likes, Heart],
                            ['Event Shares', event?.shares, Share2]
                        ].map(([label, value, Icon]) => (
                            <div key={label} className="bg-cream p-4">
                                <Icon size={15} className="text-coral" />
                                <p className="serif mt-3 text-3xl leading-none">{Number(value || 0)}</p>
                                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-ink/45">{label}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Boost */}
            <section className="bg-ink p-5 text-white sm:p-6">
                <CardTitle Icon={Megaphone}>
                    <span className="text-white/70">Event Marketing Boost</span>
                </CardTitle>
                <ul className="mt-4 space-y-2 text-sm text-white/80">
                    {BOOST_BULLETS.map((line) => (
                        <li key={line} className="flex gap-2">
                            <span className="text-butter">•</span> {line}
                        </li>
                    ))}
                </ul>
                {boostActive ? (
                    <p className="mt-5 bg-white/10 px-4 py-3 text-sm">
                        <strong>Boost campaign is active</strong> — Your event is currently being promoted.
                    </p>
                ) : (
                    <button
                        type="button"
                        onClick={() => navigate('/pricing', { state: { eventId, eventName: title, currency } })}
                        className="mt-5 bg-coral px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:opacity-90"
                    >
                        Boost Event Reach
                    </button>
                )}
            </section>

            {/* Link */}
            <Card>
                <CardTitle Icon={Link2}>Event Link</CardTitle>
                <button
                    type="button"
                    onClick={openLink}
                    className="mt-3 block w-full truncate text-left text-sm font-bold text-coral hover:underline"
                >
                    {publicUrl || '—'}
                </button>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={shareLink}
                        className="inline-flex items-center justify-center gap-2 border border-ink/15 px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider hover:border-coral"
                    >
                        <Share2 size={14} /> Share
                    </button>
                    <button
                        type="button"
                        onClick={downloadQr}
                        disabled={qrBusy}
                        className="inline-flex items-center justify-center gap-2 bg-ink px-3 py-3 text-[11px] font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                    >
                        <Download size={14} /> {qrBusy ? 'Generating…' : 'Download QR'}
                    </button>
                </div>
            </Card>

            <MemberDialog member={member} onClose={() => setMember(null)} />
        </div>
    );
}
