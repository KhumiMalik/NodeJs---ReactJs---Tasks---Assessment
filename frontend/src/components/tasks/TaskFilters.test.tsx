import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskFilters } from './TaskFilters';

function setup(search = '') {
  const onSearchChange = vi.fn();
  const onStatusChange = vi.fn();
  const view = render(
    <TaskFilters search={search} status="all" onSearchChange={onSearchChange} onStatusChange={onStatusChange} />,
  );
  const rerender = (nextSearch: string) =>
    view.rerender(
      <TaskFilters search={nextSearch} status="all" onSearchChange={onSearchChange} onStatusChange={onStatusChange} />,
    );
  return { onSearchChange, onStatusChange, rerender };
}

describe('TaskFilters', () => {
  afterEach(() => vi.useRealTimers());

  it('reports the search only after the user stops typing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { onSearchChange } = setup();

    await user.type(screen.getByRole('searchbox', { name: 'Search tasks by title' }), 'report');
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('report');
  });

  it('follows the search in the URL when it changes elsewhere (e.g. the back button)', () => {
    const { rerender } = setup('first');
    const input = screen.getByRole('searchbox', { name: 'Search tasks by title' });
    expect(input).toHaveValue('first');

    rerender('second');
    expect(input).toHaveValue('second');

    rerender('');
    expect(input).toHaveValue('');
  });

  it('reports status changes and marks the active status', async () => {
    const user = userEvent.setup();
    const { onStatusChange } = setup();

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(onStatusChange).toHaveBeenCalledWith('completed');
  });
});
