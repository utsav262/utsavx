import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Send, FileEdit, Ban, PauseCircle,
  Star, StarOff
} from 'lucide-react';

const STATUS_ACTIONS = [
  { status: 'published', label: 'Publish', icon: Send, tone: 'success' },
  { status: 'draft', label: 'Move to draft', icon: FileEdit, tone: 'neutral' },
  { status: 'sold-out', label: 'Mark sold out', icon: PauseCircle, tone: 'neutral' },
  { status: 'review_pending', label: 'Put on hold', icon: PauseCircle, tone: 'warning' },
  { status: 'cancelled', label: 'Cancel event', icon: Ban, tone: 'danger' },
];

export default function EventStatusMenu({ event, onSetStatus, onToggleFeatured, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-ink/15 p-1.5 text-ink/50 hover:border-ink/30 hover:text-ink"
        aria-label="Event actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-xl">
          <button
            onClick={() => { setOpen(false); onOpen?.(event); }}
            className="flex w-full items-center gap-2 border-b border-ink/10 px-3 py-2.5 text-left text-xs font-bold hover:bg-cream"
          >
            Open dashboard
          </button>

          <button
            onClick={() => { setOpen(false); onToggleFeatured?.(event._id, !event.featured); }}
            className="flex w-full items-center gap-2 border-b border-ink/10 px-3 py-2.5 text-left text-xs font-bold hover:bg-cream"
          >
            {event.featured ? <StarOff size={13} className="text-amber-600" /> : <Star size={13} className="text-amber-600" />}
            {event.featured ? 'Remove from featured' : 'Mark as featured'}
          </button>

          <div className="py-1">
            {STATUS_ACTIONS.filter((a) => a.status !== event.status).map((action) => (
              <button
                key={action.status}
                onClick={() => { setOpen(false); onSetStatus?.(event._id, action.status); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-cream ${
                  action.tone === 'danger' ? 'text-red-600' : 'text-ink/75'
                }`}
              >
                <action.icon size={13} />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
