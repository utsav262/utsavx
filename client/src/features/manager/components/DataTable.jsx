import { useMemo, useState } from 'react';
import { ArrowUpDown, Search, Inbox } from 'lucide-react';
import { formatDateTime } from '../../../lib/datetime.js';

const DATE_COLS = new Set(['created_on', 'createdAt', 'updatedAt', 'startsAt', 'endsAt', 'scannedAt', 'date']);

export default function DataTable({
  rows = [],
  columns = [],
  searchable = true,
  emptyText = 'No records yet.',
  onRowClick,
  actions,
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((row) =>
      columns.some((c) => String(row[c] ?? '').toLowerCase().includes(q))
    );
  }, [rows, query, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (col) => {
    if (sortKey === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="overflow-hidden border border-ink/10 bg-white">
      {searchable && (
        <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-3">
          <Search size={15} className="text-ink/45" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
          <span className="text-xs text-ink/45">{sorted.length} rows</span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink/5">
            <Inbox className="h-5 w-5 text-ink/40" />
          </div>
          <p className="mt-3 text-sm text-ink/55">
            {query ? `No results for "${query}"` : emptyText}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/[0.03]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="cursor-pointer px-4 py-3 text-[10px] font-extrabold uppercase tracking-wider text-ink/50 hover:text-ink"
                    onClick={() => toggleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.replace(/_/g, ' ')}
                      <ArrowUpDown size={10} className={sortKey === col ? 'text-coral' : 'text-ink/30'} />
                    </span>
                  </th>
                ))}
                {actions && <th className="w-px" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-t border-ink/10 ${onRowClick ? 'cursor-pointer hover:bg-cream' : ''}`}
                >
                  {columns.map((col) => {
                    const raw = row[col];
                    const display = DATE_COLS.has(col)
                      ? formatDateTime(raw) || String(raw ?? '—')
                      : String(raw ?? '—');
                    return (
                      <td key={col} className="whitespace-nowrap px-4 py-3">
                        {display}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
