import { CalendarCheck2, Inbox, ScanLine, Ticket } from 'lucide-react';
import { eventCover, EventMeta, roleLabel, SectionHeader } from './staffHelpers.jsx';

function Stat({ label, value, Icon }) {
    return (
        <div className="border border-ink/10 bg-white p-5">
            <Icon size={17} className="text-coral" />
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50">{label}</p>
            <p className="serif mt-1 text-3xl">{value}</p>
        </div>
    );
}

export default function StaffOverview({
    user,
    pendingCount,
    acceptedCount,
    declinedCount,
    nextEvent,
    onGo,
    onOpenCheckIn,
    onOpenDashboard
}) {
    return (
        <section>
            <SectionHeader
                eyebrow="Staff desk"
                title={
                    <>
                        Ready at
                        <br />
                        <i>the door.</i>
                    </>
                }
                subtitle={
                    user?.staffRoleLabel
                        ? `Signed in as ${user.staffRoleLabel}. Manage invites, open your catalog, and use the dashboard your role allows.`
                        : 'Accept team invites to unlock your event catalog and dashboard.'
                }
            />

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <Stat label="Catalog events" value={acceptedCount} Icon={Ticket} />
                <Stat label="Pending invites" value={pendingCount} Icon={Inbox} />
                <Stat label="Declined" value={declinedCount} Icon={CalendarCheck2} />
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <button
                    type="button"
                    onClick={() => onGo('events')}
                    className="border border-ink/15 bg-white p-5 text-left transition hover:border-ink/30"
                >
                    <Ticket size={18} className="text-coral" />
                    <p className="serif mt-4 text-2xl">Your catalog</p>
                    <p className="mt-2 text-sm text-ink/55">Accepted events appear here. Open dashboard by role.</p>
                </button>
                <button
                    type="button"
                    onClick={() => onGo('invites')}
                    className="border border-ink/15 bg-white p-5 text-left transition hover:border-ink/30"
                >
                    <Inbox size={18} className="text-coral" />
                    <p className="serif mt-4 text-2xl">Invitations</p>
                    <p className="mt-2 text-sm text-ink/55">Accept or decline pending team invites.</p>
                </button>
                <button
                    type="button"
                    onClick={() => (nextEvent ? onOpenCheckIn(nextEvent) : onGo('events'))}
                    className="border border-ink/15 bg-white p-5 text-left transition hover:border-ink/30"
                >
                    <ScanLine size={18} className="text-coral" />
                    <p className="serif mt-4 text-2xl">Check-in</p>
                    <p className="mt-2 text-sm text-ink/55">Scan confirmation codes at the door.</p>
                </button>
            </div>

            {nextEvent ? (
                <div className="mt-10 overflow-hidden border border-ink/15 bg-white">
                    <div className="grid gap-0 lg:grid-cols-[16rem_1fr]">
                        <div className="aspect-[16/10] bg-moss lg:aspect-auto">
                            <img src={eventCover(nextEvent.event)} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-coral">
                                    Up next · {roleLabel(nextEvent.userType)}
                                </p>
                                <h3 className="serif mt-2 text-3xl leading-none">{nextEvent.event?.title || 'Event'}</h3>
                                <EventMeta event={nextEvent.event} className="mt-3" />
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 sm:items-stretch">
                                <button
                                    type="button"
                                    onClick={() => onOpenDashboard(nextEvent)}
                                    className="bg-ink px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white"
                                >
                                    Open dashboard
                                </button>
                                {nextEvent.permissions?.canCheckIn || nextEvent.canScan ? (
                                    <button
                                        type="button"
                                        onClick={() => onOpenCheckIn(nextEvent)}
                                        className="border border-ink/20 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider"
                                    >
                                        Start check-in
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
