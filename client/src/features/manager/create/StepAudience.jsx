import { Users, ClipboardList, Ticket, Gift } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';
import Section, { ChoiceCard } from './Section.jsx';

// Suggestions only — the field is free text so any organizer can describe their audience.
const AUDIENCE_SUGGESTIONS = {
  school: ['Students', 'Parents', 'Staff', 'Alumni'],
  company: ['Employees', 'Customers', 'Partners', 'Press'],
  individual: ['Family', 'Friends', 'Invited guests'],
  sports_club: ['Players', 'Members', 'Spectators'],
  creator: ['Beginners', 'Professionals', 'Students'],
  travel: ['Solo travellers', 'Families', 'Groups'],
};

const MODE_ICONS = { paid: Ticket, free: Gift };

export default function StepAudience({ form, setForm, taxonomy, errors }) {
  const setAudience = (key, value) => setForm((f) => ({ ...f, audience: { ...f.audience, [key]: value } }));
  const setRegistration = (key, value) => setForm((f) => ({ ...f, registration: { ...f.registration, [key]: value } }));
  const suggestions = AUDIENCE_SUGGESTIONS[form.organizerType] || [];

  const addSuggestion = (word) => {
    const current = form.audience.targetAudience.split(',').map((s) => s.trim()).filter(Boolean);
    if (current.includes(word)) return;
    setAudience('targetAudience', [...current, word].join(', '));
  };

  return (
    <div className="space-y-8">
      <Section icon={<Users size={15} />} title="Who it's for">
        <Field label="Target audience" hint="Optional">
          <input
            className={inputCls}
            maxLength={200}
            placeholder="e.g. Students, Parents"
            value={form.audience.targetAudience}
            onChange={(e) => setAudience('targetAudience', e.target.value)}
          />
        </Field>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => addSuggestion(word)}
                className="border border-ink/15 px-3 py-1 text-xs font-bold text-ink/60 hover:border-coral hover:text-coral"
              >
                + {word}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum participants" hint="Optional" error={errors.minCapacity}>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className={inputCls}
              value={form.audience.minCapacity}
              onChange={(e) => setAudience('minCapacity', e.target.value)}
            />
          </Field>
          <Field label="Maximum participants" hint="Caps ticket quantities" error={errors.maxCapacity}>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className={inputCls}
              value={form.audience.maxCapacity}
              onChange={(e) => setAudience('maxCapacity', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section icon={<ClipboardList size={15} />} title="Registration">
        <Field label="How people register" required>
          <div className="grid gap-2 sm:grid-cols-2">
            {taxonomy.registrationModes.map((row) => {
              const Icon = MODE_ICONS[row.key] || Ticket;
              return (
                <ChoiceCard
                  key={row.key}
                  active={form.registration.mode === row.key}
                  onClick={() => setRegistration('mode', row.key)}
                  icon={<Icon size={16} />}
                  title={row.label}
                  hint={row.hint}
                />
              );
            })}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration opens" hint="Optional">
            <input
              type="datetime-local"
              className={inputCls}
              value={form.registration.opensAt}
              onChange={(e) => setRegistration('opensAt', e.target.value)}
            />
          </Field>
          <Field label="Registration closes" hint="Optional" error={errors.closesAt}>
            <input
              type="datetime-local"
              className={inputCls}
              min={form.registration.opensAt || undefined}
              value={form.registration.closesAt}
              onChange={(e) => setRegistration('closesAt', e.target.value)}
            />
          </Field>
        </div>
        <p className="text-xs text-ink/50">
          Online ticket sales are only accepted inside this window ({form.timezone}). Gate sales at the door are not affected.
        </p>
      </Section>
    </div>
  );
}
