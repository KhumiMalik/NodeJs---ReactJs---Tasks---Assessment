import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

const fieldClasses =
  'block w-full rounded-lg border-0 px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 ' +
  'focus:ring-2 focus:ring-inset focus:outline-none sm:text-sm disabled:bg-slate-50 disabled:text-slate-500';

function ringClasses(hasError: boolean) {
  return hasError ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-indigo-600';
}

interface FieldWrapperProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}

function FieldWrapper({ id, label, error, hint, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClasses, ringClasses(Boolean(error)), className)}
        {...props}
      />
    </FieldWrapper>
  );
}

interface TextareaProps extends ComponentProps<'textarea'> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function Textarea({ label, error, hint, id, className, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper id={inputId} label={label} error={error} hint={hint}>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(fieldClasses, ringClasses(Boolean(error)), 'resize-y', className)}
        {...props}
      />
    </FieldWrapper>
  );
}
