import { ClipboardList, Plus, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Pagination } from '../components/common/Pagination';
import { DeleteConfirmation } from '../components/tasks/DeleteConfirmation';
import { RecentActivity } from '../components/tasks/RecentActivity';
import { TaskFilters } from '../components/tasks/TaskFilters';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskList } from '../components/tasks/TaskList';
import { TaskStatistics } from '../components/tasks/TaskStatistics';
import { useCurrentUser } from '../hooks/useAuth';
import { useTaskFilters } from '../hooks/useTaskFilters';
import { TASKS_PER_PAGE, useTaskList } from '../hooks/useTasks';
import type { Task } from '../types/task';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { search, status, page, setFilters } = useTaskFilters();
  const tasksQuery = useTaskList({ search: search || undefined, status, page, perPage: TASKS_PER_PAGE });

  const [form, setForm] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const meta = tasksQuery.data?.meta;
  // After deleting the last task on the last page, step back to the new last page.
  useEffect(() => {
    if (meta && page > meta.lastPage) setFilters({ page: meta.lastPage });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setFilters is recreated on every render
  }, [meta, page]);

  const hasFilters = Boolean(search) || status !== 'all';
  const openCreate = () => setForm({ open: true });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {greeting()}
            {user ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here&apos;s an overview of your tasks.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add task
        </Button>
      </header>

      <TaskStatistics />

      <div className="grid gap-8 xl:grid-cols-3">
        <section
          aria-labelledby="tasks-heading"
          className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 xl:col-span-2"
        >
          <div className="space-y-4 border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <h2 id="tasks-heading" className="text-base font-semibold text-slate-900">
                My tasks
              </h2>
              {tasksQuery.isFetching && !tasksQuery.isPending && <LoadingSpinner size="sm" label="Updating…" />}
            </div>
            <TaskFilters
              search={search}
              status={status}
              onSearchChange={(value) => setFilters({ search: value })}
              onStatusChange={(value) => setFilters({ status: value })}
            />
          </div>

          {tasksQuery.isPending ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" label="Loading tasks…" />
            </div>
          ) : tasksQuery.isError ? (
            <ErrorState
              error={tasksQuery.error}
              title="Couldn’t load your tasks"
              onRetry={() => tasksQuery.refetch()}
            />
          ) : tasksQuery.data.data.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
                title="No matching tasks"
                description="Try a different search term or status filter."
                action={
                  <Button variant="secondary" size="sm" onClick={() => setFilters({ search: '', status: 'all' })}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />}
                title="No tasks yet"
                description="Create your first task to get started."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add task
                  </Button>
                }
              />
            )
          ) : (
            <>
              <TaskList
                tasks={tasksQuery.data.data}
                onEdit={(task) => setForm({ open: true, task })}
                onDelete={setTaskToDelete}
              />
              <Pagination
                meta={tasksQuery.data.meta}
                onPageChange={(next) => setFilters({ page: next })}
                disabled={tasksQuery.isPlaceholderData}
              />
            </>
          )}
        </section>

        <aside>
          <RecentActivity />
        </aside>
      </div>

      <TaskFormModal open={form.open} task={form.task} onClose={() => setForm({ open: false })} />
      <DeleteConfirmation task={taskToDelete} onClose={() => setTaskToDelete(null)} />
    </div>
  );
}
