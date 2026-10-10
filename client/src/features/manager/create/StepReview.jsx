import {
  CalendarDays, MapPin, Ticket, Users, Tag, Sparkles, Check, Star, Building2, Globe, Lock, ClipboardList, AlertCircle, ArrowRight, Video,
} from 'lucide-react';
import { money } from '../../../lib/money.js';
import { findOrganizer, formatLocalInput, pruneDetails } from './eventForm.js';

export default function StepReview({
  form,
  taxonomy,
  tracks,
  tickets,
  capacity,
  minPrice,
  guests,
  team,
  coupons,
  gallery,
  issues,
  onFix,
  isAdmin,
  isLive,
  busy,
  onSaveDraft,
  onSubmit,
}) {
  const organizer = findOrganizer(taxonomy, form.organizerType);
  const format = taxonomy.eventFormats.find((row) => row.key === form.eventFormat);
  const mode = taxonomy.registrationModes.find((row) => row.key === form.registration.mode);
  const details = pruneDetails(taxonomy, form.details, tracks);
  const filledDetails = Object.values(details).reduce((sum, track) => sum + Object.keys(track).length, 0);
  const ready = issues.length === 0;
  const when = [formatLocalInput(form.startsAt), form.endsAt && `until ${formatLocalInput(form.endsAt)}`].filter(Boolean).join(' ');
  const where = form.eventFormat === 'online'
    ? 'Online'
    : [form.venue.name, form.venue.city, form.venue.state, form.venue.country].filter(Boolean).join(', ');
  const registrationWindow = [
    form.registration.opensAt && `opens ${formatLocalInput(form.registration.opensAt)}`,
    form.registration.closesAt && `closes ${formatLocalInput(form.registration.closesAt)}`,
  ].filter(Boolean).join(' · ');
  const capacityText = [
    form.audience.minCapacity !== '' && `min ${form.audience.minCapacity}`,
    form.audience.maxCapacity !== '' && `max ${form.audience.maxCapacity}`,
  ].filter(Boolean).join(' · ');

  const submitLabel = isLive ? 'Save changes' : isAdmin ? 'Publish event' : 'Submit for approval';
  const busyLabel = isLive ? 'Saving…' : isAdmin ? 'Publishing…' : 'Submitting…';

  return (
    <div className="space-y-6">
      <div className="overflow-hidden border border-ink/10 bg-white">
        <div className="bg-gradient-to-br from-coral/10 via-coral/5 to-transparent p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-coral">
            {[form.category, form.subcategory].filter(Boolean).join(' · ') || 'Event'}
          </p>
          <h3 className="serif mt-2 break-words text-4xl leading-none">{form.title || 'Untitled event'}</h3>
          <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-ink/65">
            {form.description || 'No description yet.'}
          </p>
        </div>

        <div className="grid gap-4 border-t border-ink/10 p-6 sm:grid-cols-2">
          <InfoRow
            icon={<Building2 size={15} />}
            label="Organizer"
            value={[organizer?.label, form.organizationName].filter(Boolean).join(' — ') || '—'}
          />
          <InfoRow
            icon={form.visibility === 'private' ? <Lock size={15} /> : <Globe size={15} />}
            label="Format & visibility"
            value={`${format?.label || form.eventFormat} · ${form.visibility === 'private' ? 'Private (link only)' : 'Public'}`}
          />
          <InfoRow icon={<CalendarDays size={15} />} label={`When (${form.timezone})`} value={when || 'TBA'} />
          <InfoRow icon={<MapPin size={15} />} label="Where" value={where || '—'} />
          {form.eventFormat !== 'in_person' && (
            <InfoRow icon={<Video size={15} />} label="Meeting link" value={form.onlineUrl || 'Not set'} />
          )}
          <InfoRow
            icon={<ClipboardList size={15} />}
            label="Registration"
            value={[mode?.label, registrationWindow, capacityText].filter(Boolean).join(' · ')}
          />
          <InfoRow
            icon={<Ticket size={15} />}
            label="Tickets"
            value={`${tickets.length} tiers · ${capacity || '∞'} people · from ${money(minPrice)}`}
          />
          <InfoRow icon={<Users size={15} />} label="People" value={`${guests.length} guests · ${team.length} team`} />
          <InfoRow
            icon={<Tag size={15} />}
            label="Promo & media"
            value={`${coupons.length ? `${coupons.length} codes` : 'No codes'} · ${form.imageUrl ? 'cover' : 'no cover'} · ${gallery.length} gallery`}
          />
          {tracks.length > 0 && (
            <InfoRow
              icon={<Sparkles size={15} />}
              label="Event details"
              value={`${filledDetails} field${filledDetails === 1 ? '' : 's'} filled (${tracks.map((t) => taxonomy.detailTracks[t].label).join(', ')})`}
            />
          )}
          {isAdmin && form.featured && (
            <InfoRow icon={<Star size={15} className="text-amber-500" />} label="Featured" value="Home page highlight" />
          )}
        </div>
      </div>

      <div className="border border-ink/10 bg-white p-6">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/55">Pre-flight check</p>
        {ready ? (
          <p className="mt-4 flex items-center gap-3 text-sm text-ink/75">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={11} />
            </span>
            Everything required is in place.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5" role="list">
            {issues.map((issue) => (
              <li key={`${issue.stepId}-${issue.field}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span className="text-ink/75">
                  <b>{issue.stepLabel}:</b> {issue.message}
                </span>
                <button
                  type="button"
                  onClick={() => onFix(issue.stepIndex)}
                  className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-coral hover:underline"
                >
                  Fix <ArrowRight size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-ink/10 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-coral/10 text-coral">
            <Sparkles size={17} />
          </div>
          <div className="flex-1">
            <p className="font-bold">{isLive ? 'This event is live' : isAdmin ? 'Publish directly' : 'Submit for admin review'}</p>
            <p className="mt-1 text-sm text-ink/55">
              {isLive
                ? 'Changes go live as soon as you save.'
                : isAdmin
                  ? 'Event will be published immediately.'
                  : 'Submissions are typically reviewed within 24 hours.'}
            </p>
          </div>
        </div>

        <div className={`mt-6 grid gap-3 ${isLive ? '' : 'sm:grid-cols-2'}`}>
          {!isLive && (
            <button
              type="button"
              disabled={busy}
              onClick={onSaveDraft}
              className="border border-ink/20 px-5 py-4 text-sm font-extrabold uppercase tracking-wider transition hover:border-ink/40 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save as draft'}
            </button>
          )}
          <button
            type="button"
            disabled={busy || !ready}
            onClick={onSubmit}
            className="bg-coral px-5 py-4 text-sm font-extrabold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </div>

        {!ready && <p className="mt-3 text-xs text-amber-600">Fix the checklist items above before {isLive ? 'saving' : 'submitting'}.</p>}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-coral">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/45">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
