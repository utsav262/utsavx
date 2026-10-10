import { Check } from 'lucide-react';

/** Public, category-specific details (agenda, speakers, itinerary…) prepared by the API's publicDetails(). */
export default function EventSpecifics({ sections = [] }) {
  if (!sections.length) return null;
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.track} className="border border-ink/10 bg-white p-6">
          <h2 className="serif text-3xl">{section.label}</h2>
          <dl className="mt-5 space-y-5">
            {section.items.map((item) => (
              <div key={item.key}>
                <dt className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ink/50">{item.label}</dt>
                <dd className="mt-1.5 text-sm text-ink/80">
                  <Value item={item} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function Value({ item }) {
  const { type, value } = item;
  if (type === 'boolean') return <span className="inline-flex items-center gap-1.5 font-bold"><Check size={14} className="text-emerald-600" /> Yes</span>;
  if (type === 'list') {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((entry) => <span key={entry} className="bg-cream px-2.5 py-1 text-xs font-bold">{entry}</span>)}
      </div>
    );
  }
  if (type === 'schedule') {
    return (
      <ol className="divide-y divide-ink/10 border border-ink/10">
        {value.map((row, i) => (
          <li key={i} className="flex gap-4 px-3 py-2">
            {row.time && <span className="w-24 shrink-0 font-bold text-coral">{row.time}</span>}
            <span>{row.title}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (type === 'people') {
    return (
      <ul className="flex flex-wrap gap-3">
        {value.map((person, i) => (
          <li key={i} className="border border-ink/10 px-3 py-2">
            <p className="font-bold">{person.name}</p>
            {person.role && <p className="text-xs text-ink/55">{person.role}</p>}
          </li>
        ))}
      </ul>
    );
  }
  return <span className="whitespace-pre-line">{String(value)}</span>;
}
