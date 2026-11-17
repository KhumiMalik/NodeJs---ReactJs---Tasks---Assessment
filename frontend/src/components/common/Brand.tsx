import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl shadow-sm',
          inverted ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white',
        )}
      >
        <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className={cn('text-lg font-bold tracking-tight', inverted ? 'text-white' : 'text-slate-900')}>
        TaskFlow
      </span>
    </span>
  );
}
