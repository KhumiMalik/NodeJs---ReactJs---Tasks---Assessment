import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { Task } from '../../types/task';
import { cn } from '../../utils/cn';
import { formatDateTime, formatRelative } from '../../utils/format';
import { TaskCompletionToggle } from './TaskCompletionToggle';
import { TaskStatusBadge } from './TaskStatusBadge';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  return (
    <li className="group flex items-start gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-6">
      <div className="pt-0.5">
        <TaskCompletionToggle task={task} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            to={`/tasks/${task.id}`}
            className={cn(
              'truncate text-sm font-semibold hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600',
              task.isCompleted ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-900',
            )}
          >
            {task.title}
          </Link>
          <TaskStatusBadge isCompleted={task.isCompleted} />
        </div>
        {task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}
        <p className="mt-1.5 text-xs text-slate-400">
          Created{' '}
          <time dateTime={task.createdAt} title={formatDateTime(task.createdAt)}>
            {formatRelative(task.createdAt)}
          </time>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:opacity-60 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
          aria-label={`Edit “${task.title}”`}
          title="Edit"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-600"
          aria-label={`Delete “${task.title}”`}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}
