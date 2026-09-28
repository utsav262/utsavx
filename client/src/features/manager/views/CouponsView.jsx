import { useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import DataTable from '../components/DataTable.jsx';
import PanelHeader from '../components/PanelHeader.jsx';
import { apiClient } from '../../../api/index.js';

export default function CouponsView({ event, rows = [], reload, notice }) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);

  if (!event) return <p className="mt-8 text-sm text-ink/55">Select an event first.</p>;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.managerCreateCoupon({
        event_id: event._id,
        code: code.toUpperCase(),
        discount_type: 'percentage',
        discount_value: 10,
      });
      notice?.('Coupon created.', 'success');
      setCode('');
      reload?.();
    } catch (error) {
      notice?.(error.response?.data?.message || 'Coupon could not be created.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = (c) => navigator.clipboard?.writeText(c);

  return (
    <div className="mt-6 space-y-8">
      <PanelHeader
        eyebrow="Discounts"
        title="Coupons"
        subtitle="Create promo codes for your audience."
      />

      <form onSubmit={save} className="flex flex-wrap gap-2 rounded-2xl border border-ink/10 bg-white p-4">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE10"
          className="flex-1 rounded-xl border border-ink/15 bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider outline-none focus:border-coral"
        />
        <button
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <Plus size={14} /> Add 10% coupon
        </button>
      </form>

      <DataTable
        rows={rows}
        columns={['code', 'discountType', 'discountValue', 'isActive']}
        emptyText="No coupons yet."
        actions={(row) => (
          <button onClick={() => copy(row.code)} className="rounded-lg p-1.5 text-ink/50 hover:bg-cream hover:text-coral" title="Copy code">
            <Copy size={14} />
          </button>
        )}
      />
    </div>
  );
}
