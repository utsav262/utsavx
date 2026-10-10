import { useState } from 'react';
import { Image as ImageIcon, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';
import Section from './Section.jsx';
import { isHttpUrl } from './eventForm.js';

const MAX_GALLERY = 12;

export default function StepMedia({ form, setForm, gallery, setGallery, errors, newKey, logoLabel }) {
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const add = () => {
    const url = draft.trim();
    if (!url) return;
    if (!isHttpUrl(url)) return setDraftError('Use a full image URL starting with https://');
    if (gallery.some((row) => row.url === url)) return setDraftError('That image is already in the gallery');
    if (gallery.length >= MAX_GALLERY) return setDraftError(`Up to ${MAX_GALLERY} gallery images`);
    setGallery((rows) => [...rows, { key: newKey(), url }]);
    setDraft('');
    setDraftError('');
  };

  return (
    <div className="space-y-8">
      <Section title="Cover image" hint="Recommended">
        <UrlField
          label="Cover URL"
          value={form.imageUrl}
          error={errors.imageUrl}
          onChange={(value) => set('imageUrl', value)}
        />
        {form.imageUrl && isHttpUrl(form.imageUrl) ? (
          <Preview key={form.imageUrl} url={form.imageUrl} alt="Cover preview" className="aspect-[16/9]" onRemove={() => set('imageUrl', '')} />
        ) : (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-ink/15 bg-cream/40 px-6 py-12 text-center">
            <ImageIcon size={32} className="text-ink/30" />
            <p className="mt-3 text-sm font-bold">No cover yet</p>
            <p className="mt-1 text-xs text-ink/50">Paste a hosted image URL above to preview.</p>
          </div>
        )}
      </Section>

      <Section title={logoLabel} hint="Optional">
        <UrlField label="Logo URL" value={form.logoUrl} error={errors.logoUrl} onChange={(value) => set('logoUrl', value)} />
        {form.logoUrl && isHttpUrl(form.logoUrl) && (
          <Preview key={form.logoUrl} url={form.logoUrl} alt="Logo preview" className="aspect-square max-w-[140px] bg-cream/40 object-contain" onRemove={() => set('logoUrl', '')} />
        )}
      </Section>

      <Section title="Gallery" hint={`${gallery.length}/${MAX_GALLERY}`}>
        <Field label="Add image URL" error={draftError}>
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="https://…"
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setDraftError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            />
            <button type="button" onClick={add} aria-label="Add image" className="shrink-0 bg-ink px-4 text-white hover:opacity-90">
              <Plus size={16} />
            </button>
          </div>
        </Field>

        {gallery.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((row) => (
              <Preview
                key={row.key}
                url={row.url}
                alt=""
                className="aspect-square"
                onRemove={() => setGallery((rows) => rows.filter((r) => r.key !== row.key))}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-ink/45">Tip: square images work best for the gallery grid.</p>
      </Section>
    </div>
  );
}

function UrlField({ label, value, error, onChange }) {
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <LinkIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
        <input
          type="url"
          className={`${inputCls} pl-10`}
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

function Preview({ url, alt, className, onRemove }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="group relative overflow-hidden border border-ink/10">
      <img
        src={url}
        alt={alt}
        className={`w-full object-cover ${className} ${broken ? 'opacity-30' : ''}`}
        onError={() => setBroken(true)}
      />
      {broken && (
        <p className="absolute inset-x-0 bottom-0 bg-red-600/90 px-2 py-1 text-[11px] font-bold text-white">
          Image could not be loaded — check the URL
        </p>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-2 top-2 bg-ink/80 p-2 text-white transition sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
