import { Check } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useToggleTask } from '../../hooks/useTasks';
import { getErrorMessage } from '../../services/api';
import type { Task } from '../../types/task';
import { cn } from '../../utils/cn';

/** Round checkbox-style button that toggles a task between pending and completed. */
export function TaskCompletionToggle({ task }: { task: Task }) {
  const toggle = useToggleTask();
  const toast = useToast();

  function handleToggle() {
    toggle.mutate(task.id, {
      onSuccess: (updated) =>
        toast.success(
          updated.isCompleted ? `“${updated.title}” completed. Nice work!` : `“${updated.title}” marked as pending.`,
        ),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const label = task.isCompleted ? `Mark “${task.title}” as pending` : `Mark “${task.title}” as completed`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={task.isCompleted}
      aria-label={label}
      title={task.isCompleted ? 'Mark as pending' : 'Mark as completed'}
      onClick={handleToggle}
      disabled={toggle.isPending}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60',
        task.isCompleted
          ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
          : 'border-slate-300 text-transparent hover:border-indigo-500 hover:text-indigo-300',
      )}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
    </button>
  );
}
