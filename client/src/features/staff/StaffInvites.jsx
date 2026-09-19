import { formatDateTime } from '../../lib/datetime.js';
import { EmptyState, EventMeta, eventCover, place, roleLabel, SectionHeader } from './staffHelpers.jsx';

export default function StaffInvites({ pending, declined, busyId, onRespond }) {
    return (
        <div className="space-y-16">
            <section>
                <SectionHeader
                    eyebrow="Inbox"
                    title="Pending invites"
                    subtitle="Accept to join the event team. Your role becomes Event Scanner for that event."
                />

                {!pending.length ? (
                    <EmptyState
                        title="Inbox clear"
                        body="When an organizer invites your email, it shows up here."
                    />
                ) : (
                    <ul className="mt-8 space-y-4">
                        {pending.map((invite) => {
                            const event = invite.event || {};
                            return (
                                <li
                                    key={invite._id}
                                    className="grid gap-0 overflow-hidden border border-ink/15 bg-white lg:grid-cols-[12rem_1fr]"
                                >
                                    <div className="aspect-[16/10] bg-moss lg:aspect-auto">
                                        <img src={eventCover(event)} alt="" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-coral">
                                                {roleLabel(invite.userType)} · Pending
                                            </p>
                                            <h3 className="serif mt-2 text-3xl leading-none">{event.title || 'Event'}</h3>
                                            <EventMeta event={event} className="mt-3" />
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                disabled={busyId === invite._id}
                                                onClick={() => onRespond(invite._id, 'reject')}
                                                className="border border-ink/20 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider disabled:opacity-60"
                                            >
                                                Decline
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyId === invite._id}
                                                onClick={() => onRespond(invite._id, 'accept')}
                                                className="bg-coral px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60"
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {declined.length > 0 ? (
                <section>
                    <SectionHeader
                        eyebrow="History"
                        title="Declined"
                        subtitle="These invites were declined. Ask the organizer to invite you again if needed."
                    />
                    <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/15">
                        {declined.map((invite) => (
                            <li key={invite._id} className="flex flex-col gap-1 py-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-bold text-ink">{invite.event?.title || 'Event'}</p>
                                    <p className="mt-1 text-sm text-ink/50">
                                        {roleLabel(invite.userType)}
                                        {formatDateTime(invite.event?.startsAt) ? ` · ${formatDateTime(invite.event.startsAt)}` : ''}
                                        {` · ${place(invite.event)}`}
                                    </p>
                                </div>
                                <span className="text-xs font-extrabold uppercase tracking-wider text-ink/40">Declined</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
