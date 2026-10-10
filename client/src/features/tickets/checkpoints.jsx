import { DoorOpen, UtensilsCrossed } from 'lucide-react';

/** True when any tier on the event includes lunch, so scanners offer the lunch counter. */
export function eventHasLunch(event) {
  return (event?.ticketTypes || event?.tickets || []).some((t) => t.includesLunch || t.includes_lunch);
}

export const CHECKPOINT_COPY = {
  entry: { validate: 'Validate', scan: 'Claim entry', done: 'Checked in', checking: 'Claiming…' },
  lunch: { validate: 'Check lunch', scan: 'Serve lunch', done: 'Lunch served', checking: 'Serving…' },
};

/** Friendly title/body for scan rejections, including the lunch-counter statuses. */
export function describeScanError(data = {}, checkpoint = 'entry') {
  const status = data.ticket_status || data.status;
  const lunch = checkpoint === 'lunch';
  switch (status) {
    case 'invalid':
      return { title: 'Invalid ticket', body: 'This confirmation code was not found for this event. Check the QR or ask the guest for another pass.' };
    case 'already_claimed':
      return lunch
        ? { title: 'Lunch already served', body: 'This ticket has already been used at the lunch counter.' }
        : { title: 'Already checked in', body: 'This ticket was already claimed. Entry may have been used earlier.' };
    case 'not_included':
      return { title: 'No lunch on this ticket', body: data.message || 'This ticket tier does not include lunch.' };
    case 'not_checked_in':
      return { title: 'Not checked in yet', body: 'Send the guest to the entrance first — lunch opens after entry is scanned.' };
    case 'invalid_count':
      return { title: 'Check the head count', body: data.message || 'That number does not fit this ticket.' };
    case 'payment_not_done':
      return { title: 'Ticket not valid', body: 'Payment is incomplete or the ticket is not valid.' };
    default:
      return { title: 'Scan failed', body: data.message || 'Could not validate this ticket.' };
  }
}

export function CheckpointPicker({ value, onChange, disabled }) {
  const options = [
    { id: 'entry', label: 'Entry', Icon: DoorOpen },
    { id: 'lunch', label: 'Lunch counter', Icon: UtensilsCrossed },
  ];
  return (
    <div role="radiogroup" aria-label="Checkpoint" className="grid grid-cols-2 gap-2">
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={`inline-flex items-center justify-center gap-2 border px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider transition disabled:opacity-60 ${
            value === id ? 'border-coral bg-coral text-white' : 'border-ink/15 text-ink/60 hover:border-ink/30'
          }`}
        >
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}
