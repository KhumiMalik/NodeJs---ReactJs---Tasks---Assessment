import { CheckCircle2, History } from 'lucide-react';
import { Link } from 'react-router';
import { useRecentActivities } from '../../hooks/useTasks';
import { formatDateTime, formatRelative } from '../../utils/format';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function RecentActivity() {
  const { data: activities, isPending, isError, error, refetch } = useRecentActivities();

  return (
    <section aria-labelledby="recent-activity-heading" className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <History className="h-5 w-5 text-slate-400" aria-hidden="true" />
        <h2 id="recent-activity-heading" className="text-base font-semibold text-slate-900">
          Recent activity
        </h2>
      </div>

      {isPending ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <ErrorState error={error} title="Couldn’t load activity" onRetry={() => refetch()} />
      ) : activities.length === 0 ? (
        <EmptyState
          icon={<History className="h-6 w-6" aria-hidden="true" />}
          title="No activity yet"
          description="Complete a task and it will show up here."
        />
      ) : (
        <ol className="space-y-1 p-3">
          {activities.map((activity) => (
            <li key={activity.id} className="flex gap-3 rounded-lg px-2 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="text-slate-700">
                  Completed{' '}
                  {activity.taskId ? (
                    <Link to={`/tasks/${activity.taskId}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {activity.taskTitle}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{activity.taskTitle}</span>
                  )}
                </p>
                <time
                  dateTime={activity.createdAt}
                  title={formatDateTime(activity.createdAt)}
                  className="text-xs text-slate-400"
                >
                  {formatRelative(activity.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
