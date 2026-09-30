import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Ticket, CalendarDays, MapPin, Download, Share2, Search, X,
  CheckCircle2, XCircle, Clock, Sparkles, ArrowRight, ShieldCheck,
  Copy, Check, AlertCircle, ChevronDown, FileImage, FileText, QrCode
} from 'lucide-react';
import { apiClient } from '../api/index.js';
import { unwrap } from '../lib/unwrap.js';
import { formatDateTime } from '../lib/datetime.js';
import TicketPass from '../components/tickets/TicketPass.jsx';
import useTicketDownload from '../hooks/useTicketDownload.js';

/* ----------------------------- helpers ----------------------------- */
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

function statusConfig(status) {
  switch (status) {
    case 'used':
      return {
        label: 'Used',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        cls: 'bg-ink/10 text-ink/60',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        icon: <XCircle className="h-3.5 w-3.5" />,
        cls: 'bg-red-100 text-red-600',
      };
    case 'expired':
      return {
        label: 'Expired',
        icon: <Clock className="h-3.5 w-3.5" />,
        cls: 'bg-ink/10 text-ink/60',
      };
    default:
      return {
        label: 'Valid',
        icon: <Sparkles className="h-3.5 w-3.5" />,
        cls: 'bg-emerald-100 text-emerald-700',
      };
  }
}

function isUpcoming(ticket) {
  if (!ticket.event?.startsAt) return true;
  return new Date(ticket.event.startsAt) >= new Date();
}

/* ------------------------------ page ------------------------------- */
export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [downloadOpen, setDownloadOpen] = useState(false);

  const ticketRef = useRef(null);
  const { downloadPng, downloadPdf, downloadQrOnly, downloading } = useTicketDownload();

  /* ---------- fetch ---------- */
  useEffect(() => {
    let active = true;
    setLoading(true);
    apiClient
      .tickets()
      .then((response) => {
        if (!active) return;
        const rows = unwrap(response);
        const list = Array.isArray(rows) ? rows : [];
        setTickets(list);
        if (list.length) setActiveId(list[0]._id);
      })
      .catch((failure) => {
        if (!active) return;
        setError(
          failure.response?.data?.message || 'Could not load tickets.'
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  /* ---------- derived ---------- */
  const upcoming = useMemo(() => tickets.filter(isUpcoming), [tickets]);
  const past = useMemo(() => tickets.filter((t) => !isUpcoming(t)), [tickets]);

  const filtered = useMemo(() => {
    const base = tab === 'upcoming' ? upcoming : past;
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((t) =>
      `${t.event?.title || ''} ${t.ticketType || ''} ${t.confirmationCode || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [tab, upcoming, past, search]);

  const active =
    filtered.find((t) => t._id === activeId) || filtered[0] || null;
  const qrValue = active ? ticketQrValue(active) : '';

  const totalCount = tickets.length;

  /* ---------- download handlers ---------- */
  const handleDownloadPng = () => {
    setDownloadOpen(false);
    downloadPng(ticketRef.current, `ticket-${active?.confirmationCode || 'mxo'}`);
  };

  const handleDownloadPdf = () => {
    setDownloadOpen(false);
    downloadPdf(ticketRef.current, `ticket-${active?.confirmationCode || 'mxo'}`);
  };

  const handleDownloadQr = () => {
    setDownloadOpen(false);
    downloadQrOnly(qrValue, `ticket-${active?.confirmationCode || 'mxo'}`);
  };

  /* ---------- render ---------- */
  return (
    <main className="bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
        {/* ============== HEADER ============== */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-coral">
              Your plans
            </p>
            <h1 className="serif mt-2 text-5xl leading-none sm:text-6xl">
              My tickets
            </h1>
            <p className="mt-2 text-sm text-ink/55">
              Show the QR at the door — staff scan it to check you in.
            </p>
          </div>
          {totalCount > 0 && (
            <div className="border border-ink/10 bg-white px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
                Total
              </p>
              <p className="serif text-2xl">{totalCount}</p>
            </div>
          )}
        </div>

        {/* ============== ERROR ============== */}
        {error && (
          <div className="mt-6 flex items-start gap-3 border border-red-200 bg-red-50 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* ============== LOADING ============== */}
        {loading ? (
          <div className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="h-96 animate-pulse bg-ink/10" />
            <div className="h-96 animate-pulse bg-ink/10" />
          </div>
        ) : null}

        {/* ============== EMPTY ============== */}
        {!loading && !tickets.length && !error ? (
          <div className="mt-12 border border-ink/10 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral/10">
              <Ticket className="h-6 w-6 text-coral" />
            </div>
            <h2 className="serif mt-5 text-3xl">No tickets yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
              Once you book an event, your tickets will appear here instantly.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 bg-coral px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                Browse events <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="border border-ink/20 px-5 py-2.5 text-sm font-bold hover:border-coral hover:text-coral"
              >
                Go home
              </Link>
            </div>
          </div>
        ) : null}

        {/* ============== MAIN ============== */}
        {!loading && tickets.length ? (
          <>
            {/* Tabs + search */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex border border-ink/15 bg-white p-1">
                <TabBtn
                  active={tab === 'upcoming'}
                  onClick={() => {
                    setTab('upcoming');
                    setSearch('');
                  }}
                >
                  Upcoming ({upcoming.length})
                </TabBtn>
                <TabBtn
                  active={tab === 'past'}
                  onClick={() => {
                    setTab('past');
                    setSearch('');
                  }}
                >
                  Past ({past.length})
                </TabBtn>
              </div>

              {/* Search */}
              {filtered.length > 3 && (
                <div className="relative flex flex-1 items-center border border-ink/15 bg-white px-3.5 py-2 sm:max-w-xs">
                  <Search size={15} className="text-ink/45" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ticket"
                    className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="p-0.5 text-ink/40 hover:text-ink"
                      aria-label="Clear"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            {filtered.length === 0 ? (
              <div className="mt-8 border border-ink/10 bg-white px-6 py-12 text-center">
                <p className="text-sm text-ink/60">
                  {search
                    ? `No tickets match "${search}".`
                    : tab === 'upcoming'
                      ? 'No upcoming tickets found.'
                      : 'No past tickets found.'}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-3 text-sm font-bold text-coral hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                {/* ---------- LEFT: WALLET ---------- */}
                <div className="space-y-3">
                  {filtered.map((ticket) => (
                    <TicketRow
                      key={ticket._id}
                      ticket={ticket}
                      active={active?._id === ticket._id}
                      onClick={() => setActiveId(ticket._id)}
                    />
                  ))}
                </div>

                {/* ---------- RIGHT: PASS & DOWNLOAD ---------- */}
                <div className="lg:sticky lg:top-24 lg:self-start">
                  {active && (
                    <>
                      {/* Download dropdown controls */}
                      <div className="relative mb-3 flex justify-end">
                        <button
                          onClick={() => setDownloadOpen((v) => !v)}
                          disabled={downloading}
                          className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-ink/90 disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {downloading ? 'Preparing…' : 'Download pass'}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition ${
                              downloadOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {downloadOpen && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden border border-ink/10 bg-white shadow-xl">
                            <button
                              onClick={handleDownloadPng}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-ink/75 transition hover:bg-cream"
                            >
                              <FileImage className="h-4 w-4 text-coral" />
                              <div>
                                <p>Save as PNG</p>
                                <p className="text-[11px] font-normal text-ink/45">
                                  High quality image
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={handleDownloadPdf}
                              className="flex w-full items-center gap-3 border-t border-ink/10 px-4 py-3 text-left text-sm font-bold text-ink/75 transition hover:bg-cream"
                            >
                              <FileText className="h-4 w-4 text-coral" />
                              <div>
                                <p>Save as PDF</p>
                                <p className="text-[11px] font-normal text-ink/45">
                                  Print-ready document
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={handleDownloadQr}
                              className="flex w-full items-center gap-3 border-t border-ink/10 px-4 py-3 text-left text-sm font-bold text-ink/75 transition hover:bg-cream"
                            >
                              <QrCode className="h-4 w-4 text-coral" />
                              <div>
                                <p>QR Code only</p>
                                <p className="text-[11px] font-normal text-ink/45">
                                  Standalone QR PNG
                                </p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Screen preview */}
                      <ScreenPassView ticket={active} qrValue={qrValue} />

                      {/* Hidden full-size TicketPass captured for PNG/PDF download */}
                      <div
                        style={{
                          position: 'fixed',
                          left: '-99999px',
                          top: 0,
                          pointerEvents: 'none',
                        }}
                      >
                        <TicketPass ref={ticketRef} ticket={active} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

/* -------------------------- Ticket row (list) -------------------------- */
function TicketRow({ ticket, active, onClick }) {
  const cfg = statusConfig(ticket.status);
  const upcoming = isUpcoming(ticket);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full overflow-hidden border bg-white text-left transition ${
        active
          ? 'border-coral shadow-[0_12px_40px_rgba(232,93,76,0.12)]'
          : 'border-ink/10 hover:border-ink/25'
      }`}
    >
      <div className="flex gap-4 p-4">
        {/* Date block */}
        <div
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center ${
            upcoming ? 'bg-coral/10 text-coral' : 'bg-ink/5 text-ink/50'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider">
            {ticket.event?.startsAt
              ? new Date(ticket.event.startsAt).toLocaleString('en-IN', {
                  month: 'short',
                })
              : '—'}
          </span>
          <span className="serif text-2xl leading-none">
            {ticket.event?.startsAt
              ? new Date(ticket.event.startsAt).getDate()
              : '?'}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="serif line-clamp-2 text-lg leading-tight">
              {ticket.event?.title || ticket.ticketType || 'Ticket'}
            </p>
            <span
              className={`inline-flex shrink-0 items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${cfg.cls}`}
            >
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink/55">
            {ticket.ticketType || 'General'} · Qty 1
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink/55">
            {ticket.event?.startsAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatWhen(ticket.event.startsAt)}
              </span>
            )}
            {formatVenue(ticket.event?.venue) && (
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {formatVenue(ticket.event.venue)}
                </span>
              </span>
            )}
          </div>
          <p className="mt-2 font-mono text-[11px] font-bold tracking-wide text-ink/45">
            {ticket.confirmationCode}
          </p>
        </div>
      </div>
    </button>
  );
}

/* -------------------------- Screen Pass View -------------------------- */
function ScreenPassView({ ticket, qrValue }) {
  const cfg = statusConfig(ticket.status);
  const [copied, setCopied] = useState(false);
  const venue = formatVenue(ticket.event?.venue);
  const when = formatWhen(ticket.event?.startsAt);

  const copyCode = () => {
    navigator.clipboard?.writeText(ticket.confirmationCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: ticket.event?.title || 'My ticket',
          text: `Ticket ${ticket.confirmationCode}`,
          url: window.location.href,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyCode();
    }
  };

  return (
    <div className="overflow-hidden border border-ink/10 bg-white shadow-[0_12px_40px_rgba(26,26,26,0.06)]">
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-ink/10 bg-gradient-to-r from-coral/10 via-coral/5 to-transparent px-6 py-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-coral">
            Entry pass
          </p>
          <p className="mt-0.5 text-xs text-ink/55">
            Show at venue entrance
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${cfg.cls}`}
        >
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      {/* QR + Info */}
      <div className="p-6">
        <h2 className="serif line-clamp-2 text-3xl leading-tight">
          {ticket.event?.title || ticket.ticketType || 'Ticket'}
        </h2>

        <div className="mt-6 flex justify-center">
          <div className="relative border border-ink/10 bg-white p-4 shadow-[0_18px_50px_rgba(26,26,26,0.08)]">
            <QRCodeSVG
              value={qrValue}
              size={220}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
            {/* Corner brackets */}
            <span className="pointer-events-none absolute -left-1 -top-1 h-4 w-4 border-l-2 border-t-2 border-coral" />
            <span className="pointer-events-none absolute -right-1 -top-1 h-4 w-4 border-r-2 border-t-2 border-coral" />
            <span className="pointer-events-none absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-coral" />
            <span className="pointer-events-none absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-coral" />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink/50">
          Scan this code at check-in. Keep brightness up for a clean read.
        </p>

        {/* Confirmation code with copy */}
        <button
          onClick={copyCode}
          className="mt-5 flex w-full items-center justify-between border border-dashed border-ink/20 bg-cream/50 px-4 py-3 transition hover:border-coral"
        >
          <div className="text-left">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">
              Confirmation
            </p>
            <p className="font-mono text-sm font-bold tracking-wider">
              {ticket.confirmationCode}
            </p>
          </div>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 text-ink/40" />
          )}
        </button>

        {/* Meta */}
        <dl className="mt-5 space-y-2.5 text-sm">
          {ticket.ticketType && (
            <Row label="Type" value={ticket.ticketType} />
          )}
          {when && <Row label="When" value={when} />}
          {venue && <Row label="Venue" value={venue} />}
        </dl>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-ink/15 bg-white py-2.5 text-xs font-bold text-ink/70 transition hover:border-coral hover:text-coral"
          >
            <Share2 className="h-3.5 w-3.5" /> Share pass
          </button>
        </div>

        {/* Trust note */}
        <div className="mt-5 flex items-start gap-2 bg-cream/60 p-3 text-xs text-ink/60">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />
          <p>
            Each QR is unique. Screenshot sharing is safe, but avoid posting
            publicly.
          </p>
        </div>
      </div>

      {/* Perforated divider */}
      <div className="relative h-6">
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 border-t border-dashed border-ink/15" />
        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-cream" />
        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-cream" />
      </div>

      {/* Footer strip */}
      <div className="flex items-center justify-between bg-ink/[0.02] px-6 py-3 text-xs">
        <span className="font-bold text-ink/60">MXO · Entry Pass</span>
        <Link
          to="/contact"
          className="font-bold text-coral hover:underline"
        >
          Need help?
        </Link>
      </div>
    </div>
  );
}

/* --------------------------- Small components --------------------------- */
function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-xs font-extrabold transition ${
        active ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink/10 pb-2.5 last:border-b-0 last:pb-0">
      <dt className="shrink-0 text-ink/45">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}