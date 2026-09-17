import { useState } from 'react';
import { BarChart3, CalendarDays, Check, Coins, Shield, Ticket, Users, X } from 'lucide-react';
import { money } from '../../lib/money.js';

function Stat({ label, value, Icon }) {
    return (
        <div className="bg-cream p-5">
            <Icon size={17} className="text-coral" />
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-ink/50">{label}</p>
            <p className="serif mt-1 text-3xl">{value}</p>
        </div>
    );
}

const STATUS_ACTIONS = [
    { status: 'published', label: 'Publish' },
    { status: 'draft', label: 'Unpublish' },
    { status: 'sold-out', label: 'Sold out' },
    { status: 'cancelled', label: 'Cancel' },
    { status: 'review_pending', label: 'Hold' }
];

export default function AdminHome({
    overview,
    events,
    pending,
    users,
    selected,
    onOpen,
    onApprove,
    onReject,
    onSetStatus,
    onToggleFeatured,
    onSetRole
}) {
    const [tab, setTab] = useState('overview');
    const [filter, setFilter] = useState('all');

    const filteredEvents = events.filter((event) => {
        if (filter === 'all') return true;
        if (filter === 'featured') return event.featured;
        return event.status === filter;
    });

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'pending', label: `Pending (${pending.length})` },
        { id: 'events', label: `Events (${events.length})` },
        { id: 'users', label: `Users (${users.length})` }
    ];

    return (
        <section className="mt-8">
            <div className="grid gap-px bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Platform revenue" value={money(overview?.revenue)} Icon={Coins} />
                <Stat label="Paid orders" value={overview?.orders || 0} Icon={Ticket} />
                <Stat label="All events" value={overview?.events?.total || 0} Icon={CalendarDays} />
                <Stat label="Users" value={overview?.users?.total || 0} Icon={Users} />
            </div>

            <div className="mt-8 flex flex-wrap gap-2 border-b border-ink/10 pb-4">
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setTab(item.id)}
                        className={`px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider ${
                            tab === item.id ? 'bg-ink text-white' : 'border border-ink/15'
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <div className="border border-ink/10 bg-white p-6">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Access</p>
                        <h3 className="serif mt-2 text-3xl">Full platform control</h3>
                        <ul className="mt-5 space-y-3 text-sm text-ink/65">
                            <li className="border-t border-ink/10 pt-3">Approve or reject every event submission</li>
                            <li className="border-t border-ink/10 pt-3">Publish, unpublish, feature, or cancel any event</li>
                            <li className="border-t border-ink/10 pt-3">Open any organizer dashboard (sales, tickets, check-in)</li>
                            <li className="border-t border-ink/10 pt-3">Change user roles: customer, organizer, admin</li>
                        </ul>
                    </div>
                    <div className="border border-ink/10 bg-white p-6">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-coral">Snapshot</p>
                        <dl className="mt-5 space-y-3 text-sm">
                            <div className="flex justify-between border-b border-ink/10 pb-3">
                                <dt className="text-ink/50">Pending review</dt>
                                <dd className="font-bold">{overview?.events?.pending || 0}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink/10 pb-3">
                                <dt className="text-ink/50">Published</dt>
                                <dd className="font-bold">{overview?.events?.byStatus?.published || 0}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink/10 pb-3">
                                <dt className="text-ink/50">Featured</dt>
                                <dd className="font-bold">{overview?.events?.featured || 0}</dd>
                            </div>
                            <div className="flex justify-between border-b border-ink/10 pb-3">
                                <dt className="text-ink/50">Organizers</dt>
                                <dd className="font-bold">{overview?.users?.organizer || 0}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-ink/50">Customers</dt>
                                <dd className="font-bold">{overview?.users?.customer || 0}</dd>
                            </div>
                        </dl>
                        <button
                            type="button"
                            onClick={() => setTab('pending')}
                            className="mt-6 inline-flex items-center gap-2 bg-coral px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider text-white"
                        >
                            <Shield size={14} /> Review queue
                        </button>
                    </div>
                </div>
            )}

            {tab === 'pending' && (
                <div className="mt-8 border border-ink/10 bg-white">
                    <div className="border-b border-ink/10 px-5 py-4">
                        <h2 className="serif text-3xl">Pending approval</h2>
                        <p className="mt-1 text-sm text-ink/55">Approve to publish publicly across India.</p>
                    </div>
                    {pending.length ? (
                        <ul className="divide-y divide-ink/10">
                            {pending.map((event) => (
                                <li
                                    key={event._id}
                                    className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="serif text-2xl">{event.title}</p>
                                        <p className="mt-1 text-sm text-ink/55">
                                            {event.venue?.city || 'City TBA'} · by{' '}
                                            {event.organizer?.name || event.organizer?.email || 'organizer'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onOpen(event)}
                                            className="border border-ink/15 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider"
                                        >
                                            Open
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onReject(event._id)}
                                            className="inline-flex items-center gap-1 border border-ink/15 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider"
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onApprove(event._id)}
                                            className="inline-flex items-center gap-1 bg-moss px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white"
                                        >
                                            <Check size={14} /> Approve
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="px-5 py-10 text-sm text-ink/50">No events waiting for approval.</p>
                    )}
                </div>
            )}

            {tab === 'events' && (
                <div className="mt-8">
                    <div className="flex flex-wrap gap-2">
                        {['all', 'published', 'review_pending', 'draft', 'sold-out', 'cancelled', 'featured'].map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setFilter(item)}
                                className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                    filter === item ? 'bg-coral text-white' : 'border border-ink/15'
                                }`}
                            >
                                {item.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 overflow-x-auto border-y border-ink/15">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead>
                                <tr>
                                    {['Event', 'Host', 'Status', 'Featured', 'Actions'].map((column) => (
                                        <th
                                            key={column}
                                            className="px-3 py-3 text-[10px] uppercase tracking-wider text-ink/50"
                                        >
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvents.map((event) => (
                                    <tr key={event._id} className="border-t border-ink/10 align-top">
                                        <td className="px-3 py-3">
                                            <button
                                                type="button"
                                                onClick={() => onOpen(event)}
                                                className={`text-left font-bold hover:text-coral ${
                                                    selected?._id === event._id ? 'text-coral' : ''
                                                }`}
                                            >
                                                {event.title}
                                            </button>
                                            <p className="mt-1 text-xs text-ink/45">
                                                {event.venue?.city || '—'} · {event.category || 'Event'}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 text-ink/65">
                                            {event.organizer?.name || event.organizer?.email || '—'}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="rounded-full bg-ink/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                                                {(event.status || 'draft').replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <button
                                                type="button"
                                                onClick={() => onToggleFeatured(event._id, !event.featured)}
                                                className="text-xs font-bold uppercase tracking-wider text-coral"
                                            >
                                                {event.featured ? 'Yes · Unfeature' : 'No · Feature'}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => onOpen(event)}
                                                    className="border border-ink/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                                                >
                                                    Open
                                                </button>
                                                {STATUS_ACTIONS.filter((action) => action.status !== event.status).map(
                                                    (action) => (
                                                        <button
                                                            key={action.status}
                                                            type="button"
                                                            onClick={() => onSetStatus(event._id, action.status)}
                                                            className="border border-ink/15 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                                                        >
                                                            {action.label}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!filteredEvents.length && (
                            <p className="px-3 py-8 text-sm text-ink/50">No events in this filter.</p>
                        )}
                    </div>
                </div>
            )}

            {tab === 'users' && (
                <div className="mt-8 overflow-x-auto border-y border-ink/15">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead>
                            <tr>
                                {['Name', 'Email', 'Role', 'Change role'].map((column) => (
                                    <th
                                        key={column}
                                        className="px-3 py-3 text-[10px] uppercase tracking-wider text-ink/50"
                                    >
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id} className="border-t border-ink/10">
                                    <td className="px-3 py-3 font-bold">{user.name}</td>
                                    <td className="px-3 py-3 text-ink/65">{user.email}</td>
                                    <td className="px-3 py-3">
                                        <span className="rounded-full bg-moss/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-moss">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <select
                                            className="border border-ink/15 bg-transparent px-2 py-1.5 text-xs"
                                            value={user.role}
                                            onChange={(e) => onSetRole(user._id, e.target.value)}
                                        >
                                            <option value="customer">customer</option>
                                            <option value="organizer">organizer</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!users.length && <p className="px-3 py-8 text-sm text-ink/50">No users yet.</p>}
                </div>
            )}

            {tab === 'overview' && (
                <div className="mt-8 grid gap-px bg-ink/15 sm:grid-cols-3">
                    <Stat label="Organizers" value={overview?.users?.organizer || 0} Icon={Users} />
                    <Stat label="Pending" value={overview?.events?.pending || 0} Icon={Shield} />
                    <Stat label="Live published" value={overview?.events?.byStatus?.published || 0} Icon={BarChart3} />
                </div>
            )}
        </section>
    );
}
