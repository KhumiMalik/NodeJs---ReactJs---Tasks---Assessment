import { ArrowLeft, FileQuestion, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PageLoader } from '../components/common/LoadingSpinner';
import { DeleteConfirmation } from '../components/tasks/DeleteConfirmation';
import { TaskCompletionToggle } from '../components/tasks/TaskCompletionToggle';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskStatusBadge } from '../components/tasks/TaskStatusBadge';
import { useTask } from '../hooks/useTasks';
import { isApiError } from '../services/api';
import { formatDateTime } from '../utils/format';

export function TaskDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const { data: task, isPending, isError, error, refetch } = useTask(id);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const backLink = (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to dashboard
    </Link>
  );

  const notFound = !Number.isInteger(id) || id <= 0 || isApiError(error, 404) || isApiError(error, 422);

  if (notFound) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <EmptyState
            icon={<FileQuestion className="h-6 w-6" aria-hidden="true" />}
            title="Task not found"
            description="This task doesn’t exist, was moved to the trash, or belongs to someone else."
          />
        </div>
      </div>
    );
  }

  if (isPending) return <PageLoader />;

  if (isError) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <ErrorState error={error} title="Couldn’t load this task" onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {backLink}
      <article className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <header className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="pt-1">
              <TaskCompletionToggle task={task} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold break-words text-slate-900">{task.title}</h1>
              <div className="mt-2">
                <TaskStatusBadge isCompleted={task.isCompleted} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDeleting(true)} className="text-red-600">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          </div>
        </header>

        <div className="p-6">
          <h2 className="text-sm font-medium text-slate-500">Description</h2>
          {task.description ? (
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-slate-800">{task.description}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400 italic">No description provided.</p>
          )}
        </div>

        <dl className="grid gap-4 border-t border-slate-100 p-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-slate-800">
              <time dateTime={task.createdAt}>{formatDateTime(task.createdAt)}</time>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Last updated</dt>
            <dd className="mt-1 text-slate-800">
              <time dateTime={task.updatedAt}>{formatDateTime(task.updatedAt)}</time>
            </dd>
          </div>
        </dl>
      </article>

      <TaskFormModal open={editing} task={task} onClose={() => setEditing(false)} />
      <DeleteConfirmation
        task={deleting ? task : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate('/dashboard', { replace: true })}
      />
    </div>
  );
}
