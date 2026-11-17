import { AlertCircle } from 'lucide-react';

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
