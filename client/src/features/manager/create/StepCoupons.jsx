import { useState } from 'react';
import { Plus, Trash2, Tag, Percent, IndianRupee } from 'lucide-react';
import Field, { inputCls } from './Field.jsx';
import { money } from '../../../lib/money.js';

export default function StepCoupons({ coupons, setCoupons, notice }) {
  const [draft, setDraft] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '10',
  });

  const add = () => {
    if (!draft.code.trim()) return notice('Coupon code is required.');
    const value = Number(draft.discount_value);
    if (Number.isNaN(value) || value < 0) return notice('Coupon value is invalid.');
    if (draft.discount_type === 'percentage' && value > 100) {
      return notice('Percentage cannot exceed 100.');
    }
    setCoupons((rows) => [
      ...rows,
      { ...draft, code: draft.code.trim().toUpperCase() },
    ]);
    setDraft({ code: '', discount_type: 'percentage', discount_value: '10' });
    notice('');
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 serif text-2xl leading-none">
          <span className="text-coral"><Tag size={16} /></span>
          Promo codes
        </h3>
        <span className="text-xs text-ink/45">{coupons.length} added</span>
      </div>

      <p className="mb-5 text-sm text-ink/55">
        Optional. Event-specific discount codes for your audience.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={`${inputCls} uppercase`}
          placeholder="CODE10"
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setDraft({ ...draft, discount_type: 'percentage' })
            }
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition ${
              draft.discount_type === 'percentage'
                ? 'border-coral bg-coral/5 text-coral'
                : 'border-ink/15 text-ink/60'
            }`}
          >
            <Percent size={13} /> %
          </button>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, discount_type: 'fixed' })}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition ${
              draft.discount_type === 'fixed'
                ? 'border-coral bg-coral/5 text-coral'
                : 'border-ink/15 text-ink/60'
            }`}
          >
            <IndianRupee size={13} /> Flat
          </button>
        </div>
        <input
          type="number"
          min="0"
          className={`${inputCls} max-w-[120px]`}
          placeholder="Value"
          value={draft.discount_value}
          onChange={(e) => setDraft({ ...draft, discount_value: e.target.value })}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          <Plus size={16} />
        </button>
      </div>

      {coupons.length > 0 ? (
        <ul className="mt-5 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-cream/40">
          {coupons.map((c, i) => (
            <li key={`${c.code}-${i}`} className="flex items-center gap-3 px-4 py-3">
              <span className="rounded-full bg-coral/10 px-2.5 py-1 font-mono text-xs font-extrabold text-coral">
                {c.code}
              </span>
              <span className="text-sm text-ink/60">
                {c.discount_type === 'percentage'
                  ? `${c.discount_value}% off`
                  : `${money(c.discount_value)} off`}
              </span>
              <button
                type="button"
                onClick={() => setCoupons((rows) => rows.filter((_, idx) => idx !== i))}
                className="ml-auto rounded-lg p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">
          No coupons — skip if you want.
        </p>
      )}
    </div>
  );
}
