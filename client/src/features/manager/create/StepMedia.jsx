import { useState } from 'react';
import { Image as ImageIcon, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';

export default function StepMedia({
  imageUrl,
  setImageUrl,
  extraImages,
  setExtraImages,
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    if (!draft.trim()) return;
    setExtraImages((rows) => [...rows, draft.trim()]);
    setDraft('');
  };

  return (
    <div className="space-y-8">
      <Section title="Cover image" hint="Required for best results">
        <Field label="Cover URL">
          <div className="relative">
            <LinkIcon
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <input
              className={`${inputCls} pl-10`}
              placeholder="https://…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </Field>

        {imageUrl ? (
          <div className="group relative overflow-hidden rounded-2xl border border-ink/10">
            <img
              src={imageUrl}
              alt="Cover preview"
              className="aspect-[16/9] w-full object-cover"
              onError={(e) => (e.currentTarget.style.opacity = '0.3')}
            />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="absolute right-3 top-3 rounded-full bg-ink/80 p-2 text-white opacity-0 transition group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-cream/40 px-6 py-12 text-center">
            <ImageIcon size={32} className="text-ink/30" />
            <p className="mt-3 text-sm font-bold">No cover yet</p>
            <p className="mt-1 text-xs text-ink/50">
              Paste a hosted image URL above to preview.
            </p>
          </div>
        )}
      </Section>

      <Section title="Gallery" hint="Optional">
        <Field label="Add image URL">
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Extra image URL"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            />
            <button
              type="button"
              onClick={add}
              className="shrink-0 rounded-xl bg-ink px-4 text-white hover:opacity-90"
            >
              <Plus size={16} />
            </button>
          </div>
        </Field>

        {extraImages.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {extraImages.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="group relative overflow-hidden rounded-xl border border-ink/10"
              >
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setExtraImages((rows) => rows.filter((_, idx) => idx !== i))
                  }
                  className="absolute right-2 top-2 rounded-full bg-ink/80 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-ink/45">
          Tip: square images work best for the gallery grid.
        </p>
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
