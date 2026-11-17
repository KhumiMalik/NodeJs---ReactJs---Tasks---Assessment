import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md';
}

/**
 * Built on the native <dialog> element, which provides focus trapping, Escape
 * to close, an inert background and focus restoration without a library.
 */
export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape fires "cancel": let the parent decide, keeping React state in sync.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click directly on the <dialog> element is a click on the backdrop.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 shadow-xl',
        size === 'sm' ? 'max-w-md' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
