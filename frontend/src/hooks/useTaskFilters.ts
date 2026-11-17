import { useSearchParams } from 'react-router';
import type { TaskStatus } from '../types/task';

const STATUSES: TaskStatus[] = ['all', 'pending', 'completed'];

interface FilterChanges {
  search?: string;
  status?: TaskStatus;
  page?: number;
}

/**
 * Search, status and page live in the URL rather than component state, so
 * filters survive a refresh, can be shared, and work with the back button.
 */
export function useTaskFilters() {
  const [params, setParams] = useSearchParams();

  const statusParam = params.get('status') as TaskStatus | null;
  const status: TaskStatus = statusParam && STATUSES.includes(statusParam) ? statusParam : 'all';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const search = params.get('search') ?? '';

  function setFilters(changes: FilterChanges) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        const set = (key: string, value: string | undefined, defaultValue: string) => {
          if (!value || value === defaultValue) next.delete(key);
          else next.set(key, value);
        };

        if (changes.search !== undefined) set('search', changes.search.trim(), '');
        if (changes.status !== undefined) set('status', changes.status, 'all');
        // Changing a filter always returns to the first page.
        if (changes.search !== undefined || changes.status !== undefined) next.delete('page');
        if (changes.page !== undefined) set('page', String(changes.page), '1');
        return next;
      },
      // Typing in the search box should not create a history entry per keystroke.
      { replace: changes.search !== undefined },
    );
  }

  return { search, status, page, setFilters };
}
