import { RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../hooks/useToast';
import { useForceDeleteTask, useRestoreTask, useTrash } from '../hooks/useTasks';
import { getErrorMessage } from '../services/api';
import type { Task } from '../types/task';
import { formatDateTime, formatRelative } from '../utils/format';

function TrashItem({ task, onDeleteForever }: { task: Task; onDeleteForever: (task: Task) => void }) {
  const restore = useRestoreTask();
  const toast = useToast();

  function handleRestore() {
    restore.mutate(task.id, {
      onSuccess: () => toast.success(`“${task.title}” restored.`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
        {task.deletedAt && (
          <p className="mt-1 text-xs text-slate-400">
            Deleted{' '}
            <time dateTime={task.deletedAt} title={formatDateTime(task.deletedAt)}>
              {formatRelative(task.deletedAt)}
            </time>
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRestore}
          isLoading={restore.isPending}
          aria-label={`Restore “${task.title}”`}
        >
          {!restore.isPending && <RotateCcw className="h-4 w-4" aria-hidden="true" />}
          Restore
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDeleteForever(task)}
          aria-label={`Delete “${task.title}” forever`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete forever
        </Button>
      </div>
    </li>
  );
}

export function TrashPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const trashQuery = useTrash(page);
  const forceDelete = useForceDeleteTask();
  const toast = useToast();
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const setPage = (next: number) => setParams(next > 1 ? { page: String(next) } : {});

  const meta = trashQuery.data?.meta;
  useEffect(() => {
    if (meta && page > meta.lastPage) setPage(meta.lastPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPage is recreated on every render
  }, [meta, page]);

  function handleConfirmDelete() {
    if (!taskToDelete) return;
    forceDelete.mutate(taskToDelete.id, {
      onSuccess: () => {
        toast.success('Task permanently deleted.');
        setTaskToDelete(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trash</h1>
        <p className="mt-1 text-sm text-slate-500">Restore deleted tasks, or remove them permanently.</p>
      </header>

      <section aria-label="Deleted tasks" className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {trashQuery.isPending ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" label="Loading trash…" />
          </div>
        ) : trashQuery.isError ? (
          <ErrorState error={trashQuery.error} title="Couldn’t load the trash" onRetry={() => trashQuery.refetch()} />
        ) : trashQuery.data.data.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="h-6 w-6" aria-hidden="true" />}
            title="Trash is empty"
            description="Tasks you delete will appear here until you restore or permanently delete them."
          />
        ) : (
          <>
            <ul aria-label="Deleted tasks" className="divide-y divide-slate-100">
              {trashQuery.data.data.map((task) => (
                <TrashItem key={task.id} task={task} onDeleteForever={setTaskToDelete} />
              ))}
            </ul>
            <Pagination meta={trashQuery.data.meta} onPageChange={setPage} disabled={trashQuery.isPlaceholderData} />
          </>
        )}
      </section>

      <ConfirmDialog
        open={taskToDelete !== null}
        title="Delete permanently?"
        message={taskToDelete ? `“${taskToDelete.title}” will be deleted forever. This cannot be undone.` : ''}
        confirmLabel="Delete forever"
        isProcessing={forceDelete.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
}
