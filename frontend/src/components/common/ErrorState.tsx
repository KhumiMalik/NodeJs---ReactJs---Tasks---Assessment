import { AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '../../services/api';
import { Button } from './Button';

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({ error, title = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
