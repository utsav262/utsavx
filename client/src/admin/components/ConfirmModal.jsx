import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Confirm dialog for consequential actions. Esc / backdrop cancel; focus lands on Cancel. */
export default function ConfirmModal({ open, title, body, confirmLabel = 'Confirm', tone = 'coral', busy, onConfirm, onCancel, children }) {
    const cancelRef = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        cancelRef.current?.focus();
        const onKey = (e) => e.key === 'Escape' && !busy && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, busy, onCancel]);
    if (!open) return null;
    const btn = tone === 'danger' ? 'bg-red-600' : 'bg-coral';
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" onClick={() => !busy && onCancel()}>
            <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md bg-white p-6 text-ink dark:bg-[#1b1b1b] dark:text-white" onClick={(e) => e.stopPropagation()}>
                <h2 id="confirm-title" className="serif text-2xl">{title}</h2>
                {body ? <p className="mt-2 text-sm text-ink/60 dark:text-white/60">{body}</p> : null}
                {children}
                <div className="mt-6 flex justify-end gap-2">
                    <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="border border-ink/15 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider dark:border-white/15">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={busy} className={`${btn} px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white disabled:opacity-60`}>
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('admin-overlays') || document.body
    );
}
