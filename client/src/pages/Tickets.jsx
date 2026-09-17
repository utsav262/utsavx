import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { formatDateTime } from '../lib/datetime.js';

function ticketQrValue(ticket) {
    if (ticket.confirmationCode) return String(ticket.confirmationCode);
    if (ticket.qrPayload) return String(ticket.qrPayload);
    return '';
}

function formatWhen(value) {
    return formatDateTime(value);
}

function formatVenue(venue) {
    if (!venue) return null;
    if (typeof venue === 'string') return venue;
    const parts = [venue.name, venue.address, venue.city, venue.state, venue.country].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
}

export default function Tickets() {
    const [tickets, setTickets] = useState([]);
    const [error, setError] = useState('');
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        apiClient
            .tickets()
            .then((response) => {
                const rows = unwrap(response);
                const list = Array.isArray(rows) ? rows : [];
                setTickets(list);
                if (list.length) setActiveId(list[0]._id);
            })
            .catch((failure) => setError(failure.response?.data?.message || 'Could not load tickets.'));
    }, []);

    const active = tickets.find((ticket) => ticket._id === activeId) || tickets[0] || null;
    const qrValue = active ? ticketQrValue(active) : '';

    return (
        <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">Your plans</p>
            <h1 className="serif mt-2 text-6xl">My tickets</h1>
            <p className="mt-3 max-w-xl text-sm text-ink/55">Show the QR at the door — staff scan it to check you in.</p>
            {error && <p className="mt-6 text-sm text-coral">{error}</p>}

            {!tickets.length && !error ? (
                <p className="mt-12 border-y border-ink/15 py-12 text-center text-sm text-ink/55">
                    Tickets will appear here after checkout.
                </p>
            ) : null}

            {active && qrValue ? (
                <section className="mt-10 overflow-hidden border border-ink/15 bg-white">
                    <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
                        <div className="border-b border-ink/10 p-8 md:border-b-0 md:border-r md:p-10">
                            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-coral">Entry pass</p>
                            <h2 className="serif mt-3 text-4xl leading-tight md:text-5xl">
                                {active.event?.title || active.ticketType || 'Ticket'}
                            </h2>
                            <dl className="mt-8 space-y-3 text-sm">
                                <div className="flex justify-between gap-4 border-b border-ink/10 pb-3">
                                    <dt className="text-ink/45">Type</dt>
                                    <dd className="font-bold">{active.ticketType || 'General'}</dd>
                                </div>
                                {formatWhen(active.event?.startsAt) ? (
                                    <div className="flex justify-between gap-4 border-b border-ink/10 pb-3">
                                        <dt className="text-ink/45">When</dt>
                                        <dd className="text-right font-bold">{formatWhen(active.event.startsAt)}</dd>
                                    </div>
                                ) : null}
                                {formatVenue(active.event?.venue) ? (
                                    <div className="flex justify-between gap-4 border-b border-ink/10 pb-3">
                                        <dt className="text-ink/45">Venue</dt>
                                        <dd className="text-right font-bold">{formatVenue(active.event.venue)}</dd>
                                    </div>
                                ) : null}
                                <div className="flex justify-between gap-4">
                                    <dt className="text-ink/45">Confirmation</dt>
                                    <dd className="font-mono text-xs font-bold tracking-wide">{active.confirmationCode}</dd>
                                </div>
                            </dl>
                            <span
                                className={`mt-8 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                    active.status === 'used'
                                        ? 'bg-ink/10 text-ink/60'
                                        : active.status === 'cancelled'
                                            ? 'bg-coral/10 text-coral'
                                            : 'bg-moss/10 text-moss'
                                }`}
                            >
                                {active.status}
                            </span>
                        </div>

                        <div className="flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_30%,rgba(232,93,76,0.08),transparent_55%)] p-8 md:p-10">
                            <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(26,26,26,0.06)]">
                                <QRCodeSVG
                                    value={qrValue}
                                    size={200}
                                    level="M"
                                    includeMargin={false}
                                    bgColor="#ffffff"
                                    fgColor="#1a1a1a"
                                />
                            </div>
                            <p className="max-w-[14rem] text-center text-xs text-ink/50">
                                Scan this code at check-in. Keep brightness up for a clean read.
                            </p>
                        </div>
                    </div>
                </section>
            ) : null}

            {tickets.length > 1 ? (
                <div className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
                    {tickets.map((ticket) => {
                        const selected = (active?._id || activeId) === ticket._id;
                        return (
                            <button
                                type="button"
                                key={ticket._id}
                                onClick={() => setActiveId(ticket._id)}
                                className={`flex w-full items-center justify-between py-5 text-left transition ${
                                    selected ? 'bg-coral/[0.04]' : 'hover:bg-ink/[0.02]'
                                }`}
                            >
                                <div>
                                    <p className="serif text-2xl md:text-3xl">{ticket.event?.title || ticket.ticketType}</p>
                                    <p className="mt-1 text-sm text-ink/55">Confirmation {ticket.confirmationCode}</p>
                                </div>
                                <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-bold text-moss">{ticket.status}</span>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </main>
    );
}
