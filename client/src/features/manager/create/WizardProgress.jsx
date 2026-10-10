import { Check } from 'lucide-react';

export default function WizardProgress({ steps, current, onJump, canJumpTo }) {
  return (
    <div className="border border-ink/10 bg-white p-4">
      {/* Desktop: horizontal stepper */}
      <div className="hidden md:block">
        <div className="flex items-center">
          {steps.map((step, i) => {
            const isActive = i === current;
            const isDone = i < current;
            const canJump = canJumpTo(i);
            return (
              <div key={step.id} className={`flex min-w-0 items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => canJump && onJump(i)}
                  className={`group flex min-w-0 items-center gap-2 px-2 py-2 transition xl:gap-3 xl:px-3 ${
                    canJump ? 'cursor-pointer hover:bg-cream' : 'cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold transition ${
                      isActive
                        ? 'bg-coral text-white shadow-lg shadow-coral/30'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : 'bg-ink/10 text-ink/40'
                    }`}
                  >
                    {isDone ? <Check size={14} /> : i + 1}
                  </span>
                  <div className="min-w-0 text-left">
                    <p
                      className={`text-xs font-extrabold uppercase tracking-wider ${
                        isActive ? 'text-coral' : isDone ? 'text-ink' : 'text-ink/40'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="hidden truncate text-[10px] text-ink/45 2xl:block">{step.hint}</p>
                  </div>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-1 h-px min-w-2 flex-1 transition xl:mx-2 ${
                      i < current ? 'bg-emerald-500' : 'bg-ink/15'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: compact pills */}
      <div className="flex gap-2 overflow-x-auto md:hidden">
        {steps.map((step, i) => {
          const isActive = i === current;
          const isDone = i < current;
          const canJump = canJumpTo(i);
          return (
            <button
              key={step.id}
              type="button"
              disabled={!canJump}
              onClick={() => canJump && onJump(i)}
              className={`flex shrink-0 items-center gap-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider transition ${
                isActive
                  ? 'bg-coral text-white'
                  : isDone
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-ink/5 text-ink/40'
              }`}
            >
              {isDone ? <Check size={12} /> : <span>{i + 1}</span>}
              {step.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
