import { CalendarDays, MapPin, Ticket, Users, Tag, Sparkles, Check, Star } from 'lucide-react';
import { formatDateTime } from '../../../lib/datetime.js';
import { money } from '../../../lib/money.js';
import { isNonComplimentary } from '../../tickets/ticketUtils.js';

export default function StepReview({
  basics,
  tickets,
  capacity,
  minPrice,
  guests,
  handlers,
  coupons,
  isAdmin,
  busy,
  onSaveDraft,
  onPublish,
}) {
  const sellable = tickets.filter(isNonComplimentary);
  const checks = [
    { label: 'Title & description', ok: basics.title && basics.description },
    { label: 'Date & time set', ok: Boolean(basics.startsAt) },
    { label: 'Venue & city', ok: basics.venue.city },
    { label: 'At least 1 paid ticket', ok: sellable.length > 0 },
  ];
  const allOk = checks.every((c) => c.ok);

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="overflow-hidden border border-ink/10 bg-white">
        <div className="bg-gradient-to-br from-coral/10 via-coral/5 to-transparent p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-coral">
            Ready to launch
          </p>
          <h3 className="serif mt-2 text-4xl leading-none">
            {basics.title || 'Untitled event'}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
            {basics.description || 'No description yet.'}
          </p>
        </div>

        <div className="grid gap-4 border-t border-ink/10 p-6 sm:grid-cols-2">
          <InfoRow
            icon={<CalendarDays size={15} />}
            label="When"
            value={formatDateTime(basics.startsAt) || 'TBA'}
          />
          <InfoRow
            icon={<MapPin size={15} />}
            label="Where"
            value={
              [basics.venue.name, basics.venue.city, basics.venue.country]
                .filter(Boolean)
                .join(', ') || '—'
            }
          />
          <InfoRow
            icon={<Ticket size={15} />}
            label="Tickets"
            value={`${tickets.length} tiers · ${capacity || '∞'} capacity · from ${money(minPrice)}`}
          />
          <InfoRow
            icon={<Users size={15} />}
            label="People"
            value={`${guests.length} guests · ${handlers.length} team`}
          />
          <InfoRow
            icon={<Tag size={15} />}
            label="Promo"
            value={coupons.length ? `${coupons.length} codes` : 'None'}
          />
          {basics.featured && (
            <InfoRow
              icon={<Star size={15} className="text-amber-500" />}
              label="Featured"
              value="Home page highlight"
            />
          )}
        </div>
      </div>

      {/* Checklist */}
      <div className="border border-ink/10 bg-white p-6">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">
          Pre-flight check
        </p>
        <ul className="mt-4 space-y-2.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  c.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-ink/10 text-ink/40'
                }`}
              >
                {c.ok ? <Check size={11} /> : '·'}
              </span>
              <span className={c.ok ? 'text-ink/75' : 'text-ink/45'}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="border border-ink/10 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-coral/10 text-coral">
            <Sparkles size={17} />
          </div>
          <div className="flex-1">
            <p className="font-bold">
              {isAdmin ? 'Publish directly' : 'Submit for admin review'}
            </p>
            <p className="mt-1 text-sm text-ink/55">
              {isAdmin
                ? 'Event will be published immediately to public listings.'
                : 'Submissions are typically reviewed within 24 hours.'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSaveDraft}
            className="border border-ink/20 px-5 py-4 text-sm font-extrabold uppercase tracking-wider transition hover:border-ink/40 disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="button"
            disabled={busy || !allOk}
            onClick={onPublish}
            className="bg-coral px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? isAdmin
                ? 'Publishing…'
                : 'Submitting…'
              : isAdmin
                ? 'Publish event'
                : 'Submit for approval'}
          </button>
        </div>

        {!allOk && (
          <p className="mt-3 text-xs text-amber-600">
            Fix the checklist items above before publishing.
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-coral">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
