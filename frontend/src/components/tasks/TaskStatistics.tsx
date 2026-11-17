import { CheckCircle2, Circle, ListTodo, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTaskStatistics } from '../../hooks/useTasks';
import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent: string;
}

function StatCard({ label, value, icon, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <dt className="text-sm font-medium text-slate-500">{label}</dt>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', accent)}>{icon}</span>
      </div>
      <dd className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</dd>
    </div>
  );
}

export function TaskStatistics() {
  const { data, isPending, isError } = useTaskStatistics();

  const placeholder = isPending ? (
    <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-200" aria-label="Loading" />
  ) : (
    '–'
  );
  const show = (value: number | undefined) => (data && !isError ? value : placeholder);
  const completionRate = data && data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <section aria-label="Task statistics">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total tasks"
          value={show(data?.total)}
          accent="bg-indigo-50 text-indigo-600"
          icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Completed"
          value={show(data?.completed)}
          accent="bg-emerald-50 text-emerald-600"
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Pending"
          value={show(data?.pending)}
          accent="bg-amber-50 text-amber-600"
          icon={<Circle className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Completion rate"
          value={data && !isError ? `${completionRate}%` : placeholder}
          accent="bg-violet-50 text-violet-600"
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        />
      </dl>
    </section>
  );
}
