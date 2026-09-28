import { useState } from 'react';
import { Check, X, Eye, Clock, MapPin, User, Layers } from 'lucide-react';
import { formatDateTime } from '../../../lib/datetime.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function PendingTab({ pending = [], onOpen, onApprove, onReject }) {
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null);

  const toggle = (id) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((s) => (s.size === pending.length ? new Set() : new Set(pending.map((e) => e._id))));
  };

  const bulkApprove = async () => {
    for (const id of selected) await onApprove(id);
    setSelected(new Set());
    setConfirm(null);
  };

  if (!pending.length) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-ink/15 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="serif mt-5 text-3xl">All caught up!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
          No events waiting for approval. New submissions will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={selected.size === pending.length && pending.length > 0}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-ink/30 text-coral focus:ring-coral"
          />
          Select all ({pending.length})
        </label>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/55">{selected.size} selected</span>
            <button
              onClick={() => setConfirm('approve')}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700"
            >
              <Check size={13} /> Approve all
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-full border border-ink/15 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {pending.map((event) => (
          <article
            key={event._id}
            className={`overflow-hidden rounded-2xl border bg-white transition ${
              selected.has(event._id) ? 'border-coral shadow-sm' : 'border-ink/10'
            }`}
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(event._id)}
                onChange={() => toggle(event._id)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-ink/30 text-coral focus:ring-coral"
              />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                    <Clock className="inline h-3 w-3" /> Pending
                  </span>
                  {event.category && (
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink/60">
                      {event.category}
                    </span>
                  )}
                </div>
                <h3 className="serif mt-2 line-clamp-1 text-2xl leading-tight">
                  {event.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/55">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} />
                    {event.venue?.city || 'City TBA'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User size={11} />
                    {event.organizer?.name || event.organizer?.email || 'Organizer'}
                  </span>
                  {event.startsAt && (
                    <span className="inline-flex items-center gap-1">
                      <Layers size={11} />
                      {formatDateTime(event.startsAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                <button
                  onClick={() => onOpen(event)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider hover:border-ink/30"
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  onClick={() => setConfirm({ type: 'reject', event })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-red-600 hover:bg-red-100"
                >
                  <X size={12} /> Reject
                </button>
                <button
                  onClick={() => setConfirm({ type: 'approve', event })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-white hover:bg-emerald-700"
                >
                  <Check size={12} /> Approve
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Confirm */}
      <ConfirmDialog
        open={confirm === 'approve' || confirm?.type === 'approve'}
        title={
          confirm === 'approve'
            ? `Approve ${selected.size} events?`
            : `Approve "${confirm?.event?.title}"?`
        }
        message="These events will go live on the public listings."
        confirmLabel="Approve"
        tone="primary"
        onConfirm={async () => {
          if (confirm === 'approve') await bulkApprove();
          else {
            await onApprove(confirm.event._id);
            setConfirm(null);
          }
        }}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.type === 'reject'}
        title={`Reject "${confirm?.event?.title}"?`}
        message="The organizer will be notified and the event will be moved back to draft status."
        confirmLabel="Reject"
        tone="danger"
        onConfirm={async () => {
          await onReject(confirm.event._id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
