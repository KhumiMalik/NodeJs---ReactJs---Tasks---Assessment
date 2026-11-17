import { cn } from '../../utils/cn';

export function TaskStatusBadge({ isCompleted }: { isCompleted: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        isCompleted
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-amber-50 text-amber-700 ring-amber-600/20',
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', isCompleted ? 'bg-emerald-500' : 'bg-amber-500')}
        aria-hidden="true"
      />
      {isCompleted ? 'Completed' : 'Pending'}
    </span>
  );
}
