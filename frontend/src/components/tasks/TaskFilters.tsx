import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { TaskStatus } from '../../types/task';
import { cn } from '../../utils/cn';

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

interface TaskFiltersProps {
  search: string;
  status: TaskStatus;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: TaskStatus) => void;
}

export function TaskFilters({ search, status, onSearchChange, onStatusChange }: TaskFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);

  // Keep the input in sync when the URL changes elsewhere (e.g. back button).
  // Adjusting state during render is React's recommended alternative to an effect here.
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    if (searchInput.trim() !== search) setSearchInput(search);
  }

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Push the debounced value to the URL, not every keystroke.
  useEffect(() => {
    if (debouncedSearch.trim() !== search) onSearchChange(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced input
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search tasks by title…"
          aria-label="Search tasks by title"
          maxLength={255}
          className="block w-full rounded-lg border-0 py-2 pr-9 pl-9 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div role="group" aria-label="Filter by status" className="inline-flex rounded-lg bg-slate-100 p-1">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600',
              status === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
