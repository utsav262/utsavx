import {
  GraduationCap, Building2, CalendarCheck, User, Trophy, HeartHandshake, Presentation, Store, Plane, Shapes,
  Music, Briefcase, PartyPopper, Rocket, Users, BookOpen, ShoppingBag, Mountain, MapPin, Monitor, Globe, Lock,
} from 'lucide-react';
import Field, { inputCls } from './Field.jsx';
import Section, { ChoiceCard } from './Section.jsx';
import { findCategory, findOrganizer } from './eventForm.js';

// Icons are cosmetic; unknown keys added to the server taxonomy fall back to a generic icon.
const ORGANIZER_ICONS = {
  school: GraduationCap, company: Building2, agency: CalendarCheck, individual: User, sports_club: Trophy,
  ngo: HeartHandshake, creator: Presentation, business: Store, travel: Plane, other: Shapes,
};
const CATEGORY_ICONS = {
  Education: GraduationCap, Corporate: Briefcase, Entertainment: Music, Personal: PartyPopper, Startup: Rocket,
  Sports: Trophy, Community: Users, Learning: BookOpen, Business: ShoppingBag, Travel: Mountain,
};
const FORMAT_ICONS = { in_person: MapPin, online: Monitor, hybrid: Globe };
const VISIBILITY_ICONS = { public: Globe, private: Lock };

export default function StepOrganizer({ form, setForm, taxonomy, errors }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const organizer = findOrganizer(taxonomy, form.organizerType);
  const category = findCategory(taxonomy, form.category);
  // Events created before categories were introduced keep their old category until changed.
  const legacyCategory = form.category && !category ? form.category : null;

  return (
    <div className="space-y-8">
      <Section title="Who's organizing?" hint="Shapes the fields you'll see">
        <div className="grid gap-2 sm:grid-cols-2">
          {taxonomy.organizerTypes.map((row) => {
            const Icon = ORGANIZER_ICONS[row.key] || Shapes;
            return (
              <ChoiceCard
                key={row.key}
                active={form.organizerType === row.key}
                onClick={() => set({ organizerType: row.key })}
                icon={<Icon size={16} />}
                title={row.label}
              />
            );
          })}
        </div>
        {errors.organizerType && <p className="text-xs font-bold text-red-600">{errors.organizerType}</p>}

        {organizer?.orgLabel && (
          <Field label={organizer.orgLabel} required={organizer.orgRequired} error={errors.organizationName}>
            <input
              className={inputCls}
              maxLength={140}
              value={form.organizationName}
              onChange={(e) => set({ organizationName: e.target.value })}
            />
          </Field>
        )}
      </Section>

      <Section title="What kind of event?" hint="Category is separate from organizer">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {taxonomy.categories.map((row) => {
            const Icon = CATEGORY_ICONS[row.key] || Shapes;
            const active = form.category === row.key;
            return (
              <button
                key={row.key}
                type="button"
                aria-pressed={active}
                onClick={() => set({ category: row.key, subcategory: row.subcategories.includes(form.subcategory) ? form.subcategory : '' })}
                className={`flex flex-col items-center gap-1.5 border p-3 text-xs font-bold transition ${
                  active ? 'border-coral bg-coral/5 text-coral' : 'border-ink/15 text-ink/60 hover:border-ink/30'
                }`}
              >
                <Icon size={16} />
                {row.key}
              </button>
            );
          })}
        </div>
        {legacyCategory && (
          <p className="border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Current category: <b>{legacyCategory}</b>. It stays as is unless you pick a new one above.
          </p>
        )}
        {errors.category && <p className="text-xs font-bold text-red-600">{errors.category}</p>}

        {category && (
          <Field label="Type of event" hint="Optional">
            <div className="flex flex-wrap gap-2">
              {category.subcategories.map((sub) => {
                const active = form.subcategory === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set({ subcategory: active ? '' : sub })}
                    className={`border px-3 py-1.5 text-xs font-bold transition ${
                      active ? 'border-coral bg-coral text-white' : 'border-ink/15 text-ink/65 hover:border-ink/30'
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </Section>

      <Section title="Format & visibility">
        <Field label="Format" required>
          <div className="grid gap-2 sm:grid-cols-3">
            {taxonomy.eventFormats.map((row) => {
              const Icon = FORMAT_ICONS[row.key] || Globe;
              return (
                <ChoiceCard
                  key={row.key}
                  active={form.eventFormat === row.key}
                  onClick={() => set({ eventFormat: row.key })}
                  icon={<Icon size={16} />}
                  title={row.label}
                />
              );
            })}
          </div>
        </Field>
        <Field label="Visibility" required>
          <div className="grid gap-2 sm:grid-cols-2">
            {taxonomy.visibilities.map((row) => {
              const Icon = VISIBILITY_ICONS[row.key] || Globe;
              return (
                <ChoiceCard
                  key={row.key}
                  active={form.visibility === row.key}
                  onClick={() => set({ visibility: row.key })}
                  icon={<Icon size={16} />}
                  title={row.label}
                  hint={row.hint}
                />
              );
            })}
          </div>
        </Field>
      </Section>
    </div>
  );
}
