import { Star, Video } from 'lucide-react';
import Field, { inputCls, inputSerifCls } from './Field.jsx';
import Section from './Section.jsx';
import { TIMEZONES } from './eventForm.js';

export default function StepBasics({ form, setForm, errors, isAdmin, showAcademicSession }) {
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setVenue = (key, value) => setForm((f) => ({ ...f, venue: { ...f.venue, [key]: value } }));
  const zones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];
  const needsVenue = form.eventFormat !== 'online';
  const needsLink = form.eventFormat !== 'in_person';

  return (
    <div className="space-y-8">
      <Section title="Identity" hint="What's it called?">
        <Field label="Event title" required error={errors.title}>
          <input
            className={inputSerifCls}
            placeholder="Midnight Market"
            maxLength={140}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field label="Description" required hint={`${form.description.length}/2000`} error={errors.description}>
          <textarea
            rows={5}
            maxLength={2000}
            className={`${inputCls} resize-y leading-7`}
            placeholder="Tell people what to expect…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        {showAcademicSession && (
          <Field label="Academic session" hint="Optional">
            <input
              className={inputCls}
              placeholder="2026-27"
              maxLength={40}
              value={form.academicSession}
              onChange={(e) => set('academicSession', e.target.value)}
            />
          </Field>
        )}
      </Section>

      <Section title="When" hint="Times are in the zone you pick">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" required error={errors.startsAt}>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
            />
          </Field>
          <Field label="Ends" hint="Optional" error={errors.endsAt}>
            <input
              type="datetime-local"
              className={inputCls}
              min={form.startsAt || undefined}
              value={form.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
            />
          </Field>
          <Field label="Time zone" className="sm:col-span-2">
            <select className={inputCls} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {needsVenue && (
        <Section title="Where" hint="Venue details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Venue name">
              <input className={inputCls} placeholder="Venue name" value={form.venue.name} onChange={(e) => setVenue('name', e.target.value)} />
            </Field>
            <Field label="Address">
              <input className={inputCls} placeholder="Street address" value={form.venue.address} onChange={(e) => setVenue('address', e.target.value)} />
            </Field>
            <Field label="City" required error={errors.city}>
              <input className={inputCls} placeholder="Mumbai" value={form.venue.city} onChange={(e) => setVenue('city', e.target.value)} />
            </Field>
            <Field label="State">
              <input className={inputCls} placeholder="Maharashtra" value={form.venue.state} onChange={(e) => setVenue('state', e.target.value)} />
            </Field>
            <Field label="Country">
              <input className={inputCls} placeholder="India" value={form.venue.country} onChange={(e) => setVenue('country', e.target.value)} />
            </Field>
          </div>
        </Section>
      )}

      {needsLink && (
        <Section icon={<Video size={15} />} title="Online access" hint="Shown only to ticket holders">
          <Field label="Meeting link" hint="Required before submitting" error={errors.onlineUrl}>
            <input
              type="url"
              className={inputCls}
              placeholder="https://meet.example.com/…"
              value={form.onlineUrl}
              onChange={(e) => set('onlineUrl', e.target.value)}
            />
          </Field>
        </Section>
      )}

      {isAdmin && (
        <Section title="Promotion" hint="Admins only">
          <label className="flex cursor-pointer items-start gap-3 border border-ink/15 bg-white p-4 transition hover:border-coral">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-coral"
              checked={form.featured}
              onChange={(e) => set('featured', e.target.checked)}
            />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold">
                <Star size={14} className="text-amber-500" />
                Feature on the public home page
              </p>
              <p className="mt-0.5 text-xs text-ink/55">When published, this event gets top billing across the platform.</p>
            </div>
          </label>
        </Section>
      )}
    </div>
  );
}
