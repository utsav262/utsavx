import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarDays, MapPin, Ticket, ShieldCheck, Video } from 'lucide-react';
import { formatDateTime } from '../../lib/datetime.js';

/* ----------------------------- helpers ----------------------------- */
function formatVenue(venue) {
  if (!venue) return null;
  if (typeof venue === 'string') return venue;
  const parts = [venue.name, venue.address, venue.city, venue.state, venue.country].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function ticketQrValue(ticket) {
  if (!ticket) return '';
  if (ticket.confirmationCode) return String(ticket.confirmationCode);
  if (ticket.qrPayload) return String(ticket.qrPayload);
  return '';
}

function statusLabel(status) {
  switch (status) {
    case 'used': return { label: 'USED', color: '#6b7280' };
    case 'cancelled': return { label: 'CANCELLED', color: '#dc2626' };
    case 'expired': return { label: 'EXPIRED', color: '#6b7280' };
    default: return { label: 'VALID', color: '#059669' };
  }
}

/* ============================================================
   TicketPass — used for BOTH screen view and download.
   Fixed width ensures identical download output.
   ============================================================ */
const TicketPass = forwardRef(function TicketPass({ ticket }, ref) {
  if (!ticket) return null;

  const qrValue = ticketQrValue(ticket);
  const isOnline = ticket.event?.eventFormat === 'online';
  const venue = isOnline ? 'Online event' : formatVenue(ticket.event?.venue);
  // Only ticket owners receive onlineUrl from the API; it is never on the public event page.
  const joinUrl = ticket.event?.eventFormat && ticket.event.eventFormat !== 'in_person' ? ticket.event?.onlineUrl : '';
  const when = formatDateTime(ticket.event?.startsAt);
  const status = statusLabel(ticket.status);

  // Download-safe: fixed width, inline styles where critical
  return (
    <div
      ref={ref}
      style={{
        width: '820px',
        fontFamily:
          '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        background: '#ffffff',
        color: '#1a1a1a',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
        border: '1px solid rgba(26,26,26,0.08)',
      }}
    >
      {/* ---------- HEADER ---------- */}
      <div
        style={{
          background: 'linear-gradient(135deg, #E85D4C 0%, #d94b3a 100%)',
          color: '#ffffff',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              opacity: 0.9,
            }}
          >
            Entry Pass
          </div>
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: '32px',
              lineHeight: 1,
              marginTop: '6px',
            }}
          >
            MXO<span style={{ opacity: 0.7 }}>.</span>
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.18)',
            padding: '8px 14px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.16em',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          {status.label}
        </div>
      </div>

      {/* ---------- BODY ---------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: 0,
        }}
      >
        {/* ===== LEFT: EVENT INFO ===== */}
        <div style={{ padding: '32px' }}>
          <p
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#E85D4C',
              marginBottom: '10px',
            }}
          >
            You're going to
          </p>

          <h1
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '42px',
              lineHeight: 1.05,
              margin: 0,
              marginBottom: '24px',
              color: '#1a1a1a',
            }}
          >
            {ticket.event?.title || ticket.ticketType || 'Event'}
          </h1>

          {/* Info grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px 24px',
              marginBottom: '28px',
            }}
          >
            <InfoBlock
              label="Date & time"
              value={when || 'TBA'}
              icon={<CalendarDays size={14} />}
            />
            <InfoBlock
              label="Venue"
              value={venue || 'TBA'}
              icon={<MapPin size={14} />}
            />
            {joinUrl && (
              <InfoBlock
                label="Join online"
                value={joinUrl}
                icon={<Video size={14} />}
              />
            )}
            <InfoBlock
              label="Ticket type"
              value={
                Number(ticket.admits) > 1
                  ? `${ticket.ticketType || 'General Admission'} · Admits ${ticket.admits}`
                  : ticket.ticketType || 'General Admission'
              }
              icon={<Ticket size={14} />}
            />
            <InfoBlock
              label="Attendee"
              value={ticket.attendeeName || 'You'}
              icon={<ShieldCheck size={14} />}
            />
          </div>

          {/* Confirmation code */}
          <div
            style={{
              borderTop: '1px dashed rgba(26,26,26,0.15)',
              paddingTop: '20px',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'rgba(26,26,26,0.45)',
                marginBottom: '6px',
              }}
            >
              Confirmation number
            </p>
            <p
              style={{
                fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                margin: 0,
                color: '#1a1a1a',
              }}
            >
              {ticket.confirmationCode || '—'}
            </p>
          </div>
        </div>

        {/* ===== RIGHT: QR CODE ===== */}
        <div
          style={{
            background: '#faf8f5',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: '1px dashed rgba(26,26,26,0.15)',
            position: 'relative',
          }}
        >
          {/* Perforation circles */}
          <span
            style={{
              position: 'absolute',
              top: '-14px',
              left: '-14px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '-14px',
              left: '-14px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#ffffff',
            }}
          />

          <p
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(26,26,26,0.5)',
              marginBottom: '14px',
            }}
          >
            Scan at entry
          </p>

          <div
            style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(26,26,26,0.08)',
            }}
          >
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
          </div>

          <p
            style={{
              fontSize: '10px',
              color: 'rgba(26,26,26,0.5)',
              textAlign: 'center',
              marginTop: '14px',
              lineHeight: 1.5,
              maxWidth: '200px',
            }}
          >
            Keep brightness up. Do not share publicly.
          </p>
        </div>
      </div>

      {/* ---------- FOOTER ---------- */}
      <div
        style={{
          background: '#1a1a1a',
          color: '#ffffff',
          padding: '14px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          letterSpacing: '0.06em',
        }}
      >
        <span style={{ opacity: 0.7 }}>
          Show this pass at the venue entrance
        </span>
        <span style={{ opacity: 0.7, fontWeight: 700 }}>
          MXO
        </span>
      </div>
    </div>
  );
});

/* --------------------------- InfoBlock --------------------------- */
function InfoBlock({ label, value, icon }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(26,26,26,0.45)',
          marginBottom: '6px',
        }}
      >
        <span style={{ color: '#E85D4C' }}>{icon}</span>
        {label}
      </div>
      <p
        style={{
          fontSize: '13px',
          fontWeight: 700,
          lineHeight: 1.4,
          margin: 0,
          color: '#1a1a1a',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default TicketPass;
