import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

type ToastType = 'success' | 'error';

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (message) => show('success', message), error: (message) => show('error', message) }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1',
              toast.type === 'success' ? 'ring-emerald-200' : 'ring-red-200',
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
            )}
            <p className="flex-1 text-sm font-medium text-slate-800">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
