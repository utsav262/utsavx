import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((rows) => rows.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback((message, tone = 'success', ms = 3200) => {
        const id = ++toastId;
        setToasts((rows) => [...rows, { id, message, tone }]);
        window.setTimeout(() => dismiss(id), ms);
        return id;
    }, [dismiss]);

    const api = useMemo(() => ({
        success: (message, ms) => push(message, 'success', ms),
        error: (message, ms) => push(message, 'error', ms),
        info: (message, ms) => push(message, 'info', ms)
    }), [push]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-4 pb-6"
                aria-live="polite"
            >
                {toasts.map((toast) => {
                    const isError = toast.tone === 'error';
                    const isSuccess = toast.tone === 'success';
                    return (
                        <div
                            key={toast.id}
                            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 border px-4 py-3 text-sm shadow-[0_16px_40px_rgba(26,26,26,0.12)] ${
                                isError
                                    ? 'border-coral/30 bg-white text-coral'
                                    : isSuccess
                                        ? 'border-moss/30 bg-white text-moss'
                                        : 'border-ink/15 bg-white text-ink'
                            }`}
                        >
                            {isError ? <XCircle size={18} className="mt-0.5 shrink-0" /> : null}
                            {isSuccess ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : null}
                            <p className="flex-1 font-bold leading-snug">{toast.message}</p>
                            <button
                                type="button"
                                onClick={() => dismiss(toast.id)}
                                className="shrink-0 text-ink/40 hover:text-ink"
                                aria-label="Dismiss"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        return {
            success: () => {},
            error: () => {},
            info: () => {}
        };
    }
    return ctx;
}
