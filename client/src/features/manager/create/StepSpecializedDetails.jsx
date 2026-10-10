import { useState } from 'react';
import { Plus, Trash2, Lock, X } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';
import Section from './Section.jsx';

/** Renders the detail tracks (education, sports, …) for this organizer + category from the server taxonomy. */
export default function StepSpecializedDetails({ form, setForm, taxonomy, tracks }) {
  const setValue = (track, key, value) =>
    setForm((f) => ({
      ...f,
      details: { ...f.details, [track]: { ...(f.details?.[track] || {}), [key]: value } },
    }));

  return (
    <div className="space-y-8">
      {tracks.map((track) => {
        const spec = taxonomy.detailTracks[track];
        const values = form.details?.[track] || {};
        return (
          <Section key={track} title={spec.label} hint="All optional">
            <div className="grid gap-5 sm:grid-cols-2">
              {spec.fields.map((field) => (
                <DetailField
                  key={field.key}
                  field={field}
                  value={values[field.key]}
                  limits={taxonomy.limits}
                  onChange={(value) => setValue(track, field.key, value)}
                />
              ))}
            </div>
          </Section>
        );
      })}
      <p className="flex items-start gap-2 text-xs text-ink/50">
        <Lock size={13} className="mt-0.5 shrink-0" />
        Fields marked private are visible only to you and your team — they never appear on the public event page.
      </p>
    </div>
  );
}

const WIDE = new Set(['textarea', 'list', 'schedule', 'people']);

function DetailField({ field, value, onChange, limits }) {
  const label = field.private ? `${field.label} · private` : field.label;
  const className = WIDE.has(field.type) ? 'sm:col-span-2' : '';

  if (field.type === 'boolean') {
    return (
      <label className={`flex cursor-pointer items-start gap-3 border border-ink/15 p-3.5 transition hover:border-coral ${className}`}>
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-coral" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm font-bold text-ink/80">{label}</span>
      </label>
    );
  }

  return (
    <Field label={label} hint={field.hint} className={className}>
      {field.type === 'text' && (
        <input
          className={inputCls}
          maxLength={field.maxLength || limits.text}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === 'textarea' && (
        <textarea
          rows={4}
          maxLength={limits.textarea}
          className={`${inputCls} resize-y`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === 'number' && (
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className={inputCls}
          value={value ?? ''}
          onChange={(e) => {
            const n = Math.floor(Number(e.target.value));
            onChange(e.target.value === '' || Number.isNaN(n) ? '' : String(Math.max(0, n)));
          }}
        />
      )}
      {field.type === 'select' && (
        <select className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {field.options.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
      )}
      {field.type === 'list' && <ListInput value={value || []} onChange={onChange} placeholder={field.placeholder} limits={limits} />}
      {field.type === 'schedule' && (
        <RowsInput
          value={value || []}
          onChange={onChange}
          limits={limits}
          columns={[
            { key: 'time', placeholder: 'When (e.g. 10:00, Day 1)', max: limits.scheduleTime, narrow: true },
            { key: 'title', placeholder: field.titleLabel || 'What happens', max: limits.text, required: true },
          ]}
        />
      )}
      {field.type === 'people' && (
        <RowsInput
          value={value || []}
          onChange={onChange}
          limits={limits}
          columns={[
            { key: 'name', placeholder: 'Name', max: limits.text, required: true },
            { key: 'role', placeholder: field.roleLabel || 'Role', max: limits.text },
          ]}
        />
      )}
    </Field>
  );
}

function ListInput({ value, onChange, placeholder, limits }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const item = draft.trim().slice(0, limits.listItem);
    if (!item || value.includes(item) || value.length >= limits.listItems) return;
    onChange([...value, item]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder={placeholder || 'Type and press Enter'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button type="button" onClick={add} aria-label="Add" className="shrink-0 bg-ink px-4 text-white hover:opacity-90">
          <Plus size={16} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 bg-coral/10 px-2.5 py-1 text-xs font-bold text-coral">
              {item}
              <button type="button" aria-label={`Remove ${item}`} onClick={() => onChange(value.filter((v) => v !== item))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Editable rows (schedule or people). A row is added only once its required column is filled. */
function RowsInput({ value, onChange, columns, limits }) {
  const blank = Object.fromEntries(columns.map((c) => [c.key, '']));
  const [draft, setDraft] = useState(blank);
  const required = columns.find((c) => c.required).key;
  const add = () => {
    if (!draft[required].trim() || value.length >= limits.rows) return;
    onChange([...value, Object.fromEntries(columns.map((c) => [c.key, draft[c.key].trim()]))]);
    setDraft(blank);
  };
  const cols = columns.map((c) => (c.narrow ? 'minmax(0,0.6fr)' : 'minmax(0,1fr)')).join(' ');
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="divide-y divide-ink/10 border border-ink/10">
          {value.map((row, index) => (
            <li key={`${row[required]}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
              {columns.map((c) => (
                <span key={c.key} className={c.narrow ? 'w-28 shrink-0 text-xs font-bold text-ink/55' : 'min-w-0 flex-1 truncate'}>
                  {row[c.key]}
                </span>
              ))}
              <button
                type="button"
                aria-label="Remove row"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="p-1 text-ink/40 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 sm:[grid-template-columns:var(--cols)_auto]" style={{ '--cols': cols }}>
        {columns.map((c) => (
          <input
            key={c.key}
            className={inputCls}
            maxLength={c.max}
            placeholder={c.placeholder}
            value={draft[c.key]}
            onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          />
        ))}
        <button type="button" onClick={add} aria-label="Add row" className="bg-ink px-4 py-3 text-white hover:opacity-90">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
