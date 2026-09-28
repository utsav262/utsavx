import { Music, UtensilsCrossed, GraduationCap, Heart, Briefcase, Star } from 'lucide-react';
import Field, { inputCls, inputSerifCls } from './Field.jsx';

const CATEGORIES = [
  { value: 'Music', icon: Music },
  { value: 'Food & Drink', icon: UtensilsCrossed },
  { value: 'Workshop', icon: GraduationCap },
  { value: 'Wellness', icon: Heart },
  { value: 'Conference', icon: Briefcase },
];

export default function StepBasics({ basics, setBasics, errors }) {
  const set = (key, value) => setBasics({ ...basics, [key]: value });
  const setVenue = (key, value) => setBasics({ ...basics, venue: { ...basics.venue, [key]: value } });

  return (
    <div className="space-y-8">
      {/* Section: Identity */}
      <Section title="Identity" hint="What's the vibe?">
        <Field label="Event title" required error={errors.title}>
          <input
            className={inputSerifCls}
            placeholder="Midnight Market"
            value={basics.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </Field>

        <Field
          label="Description"
          required
          hint={`${basics.description.length}/500`}
          error={errors.description}
        >
          <textarea
            rows={5}
            maxLength={500}
            className={`${inputCls} resize-none leading-7`}
            placeholder="Tell people what this night feels like…"
            value={basics.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        <Field label="Category" required>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = basics.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('category', c.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                    active
                      ? 'border-coral bg-coral/5 text-coral'
                      : 'border-ink/15 text-ink/60 hover:border-ink/30'
                  }`}
                >
                  <Icon size={16} />
                  {c.value}
                </button>
              );
            })}
          </div>
        </Field>
      </Section>

      {/* Section: When */}
      <Section title="When" hint="Date and time">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" required error={errors.startsAt}>
            <input
              type="datetime-local"
              className={inputCls}
              value={basics.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
            />
          </Field>
          <Field label="Ends" hint="Optional">
            <input
              type="datetime-local"
              className={inputCls}
              value={basics.endsAt}
              onChange={(e) => set('endsAt', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Section: Where */}
      <Section title="Where" hint="Venue details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Venue name">
            <input
              className={inputCls}
              placeholder="Venue name"
              value={basics.venue.name}
              onChange={(e) => setVenue('name', e.target.value)}
            />
          </Field>
          <Field label="City" required error={errors.city}>
            <input
              className={inputCls}
              placeholder="Mumbai"
              value={basics.venue.city}
              onChange={(e) => setVenue('city', e.target.value)}
            />
          </Field>
          <Field label="Address">
            <input
              className={inputCls}
              placeholder="Street address"
              value={basics.venue.address}
              onChange={(e) => setVenue('address', e.target.value)}
            />
          </Field>
          <Field label="Country">
            <input
              className={inputCls}
              placeholder="India"
              value={basics.venue.country}
              onChange={(e) => setVenue('country', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Section: Promotion */}
      <Section title="Promotion" hint="Optional">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-white p-4 transition hover:border-coral">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-coral"
            checked={basics.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />
          <div>
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Star size={14} className="text-amber-500" />
              Feature on the public home page
            </p>
            <p className="mt-0.5 text-xs text-ink/55">
              When published, this event gets top billing across the platform.
            </p>
          </div>
        </label>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="serif text-2xl leading-none">{title}</h3>
        {hint && <span className="text-xs text-ink/45">{hint}</span>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
