import { useState } from 'react';
import { ScanLine, Check, XCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import PanelHeader from '../components/PanelHeader.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { apiClient } from '../../../api/index.js';

function normalizeScanCode(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value);
      return String(parsed.confirmationCode || parsed.confirmation_id || parsed.code || value).trim();
    } catch {
      return value;
    }
  }
  return value;
}

export default function GateView({ event, notice }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const scan = async (action) => {
    setFieldError('');
    setResult(null);
    if (!event) {
      setFieldError('Select an event first.');
      return;
    }
    const normalized = normalizeScanCode(code);
    if (!normalized) {
      setFieldError('Enter or scan a confirmation code.');
      return;
    }
    setBusy(true);
    try {
      const response = await apiClient.scanTicket({ event_id: event._id, code: normalized, action });
      const message = response.data.message || 'Ticket processed.';
      const status = response.data.ticket_status || response.data.status;
      setResult({ ok: true, message, status });
      if (toast?.success) toast.success(message);
      setHistory((h) => [{ code: normalized, ok: true, message, at: new Date() }, ...h].slice(0, 8));
      if (action === 'scan') setCode('');
    } catch (error) {
      const data = error.response?.data || {};
      const status = data.ticket_status || data.status;
      const message =
        status === 'invalid'
          ? 'Invalid ticket — confirmation code not found for this event.'
          : status === 'already_claimed'
            ? 'Ticket already claimed.'
            : data.message || 'Ticket scan failed.';
      setFieldError(message);
      setResult({ ok: false, message, status });
      setHistory((h) => [{ code: normalizeScanCode(code), ok: false, message, at: new Date() }, ...h].slice(0, 8));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setCode('');
    setResult(null);
    setFieldError('');
  };

  return (
    <div className="mt-6 space-y-8">
      <PanelHeader
        eyebrow="Gate"
        title="Check-in"
        subtitle="Scan or paste confirmation codes to validate entry."
      />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Scanner */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <label className="text-xs font-extrabold uppercase tracking-wider text-ink/45">
            Confirmation code
          </label>
          <div className="mt-2 flex gap-2">
            <input
              className={`min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-3 font-mono text-sm outline-none focus:border-coral ${
                fieldError ? 'border-red-400' : 'border-ink/15'
              }`}
              placeholder="Scan or paste code"
              value={code}
              disabled={busy}
              onChange={(e) => {
                setCode(e.target.value);
                if (fieldError) setFieldError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') scan('scan');
              }}
              autoFocus
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => scan('validate')}
              className="rounded-xl border border-ink/15 px-4 hover:border-coral hover:text-coral disabled:opacity-60"
              title="Validate only"
            >
              <ScanLine size={18} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => scan('scan')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-coral px-5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              <Check size={16} /> Claim
            </button>
          </div>

          {fieldError && <p className="mt-3 text-sm text-red-600">{fieldError}</p>}

          {result?.ok && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-800">Valid ticket</p>
                <p className="text-emerald-700">{result.message}</p>
              </div>
            </div>
          )}

          {result && !result.ok && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div>
                <p className="font-bold text-red-700">Rejected</p>
                <p className="text-red-600">{result.message}</p>
              </div>
            </div>
          )}

          {(result || code) && (
            <button onClick={reset} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-ink">
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        {/* History */}
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <h3 className="font-bold">Recent scans</h3>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">No scans yet in this session.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.map((h, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-xs">
                  {h.ok ? (
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle size={13} className="shrink-0 text-red-600" />
                  )}
                  <span className="flex-1 truncate font-mono font-bold">{h.code}</span>
                  <span className={`shrink-0 ${h.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                    {h.ok ? 'OK' : 'Fail'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
