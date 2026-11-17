import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { apiError, makeTask, paginated, renderWithProviders, testUser } from '../test/utils';
import { DashboardPage } from './DashboardPage';

vi.mock('../services/taskService', () => ({
  taskService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleCompletion: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
    forceDelete: vi.fn(),
    statistics: vi.fn(),
    trash: vi.fn(),
    recentActivities: vi.fn(),
  },
}));

vi.mock('../services/authService', () => ({
  authService: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

const tasks = [
  makeTask({ id: 1, title: 'Write report', description: 'Quarterly numbers' }),
  makeTask({ id: 2, title: 'Call the bank', isCompleted: true }),
];

function renderDashboard(route = '/dashboard') {
  return renderWithProviders(<DashboardPage />, { route, path: '/dashboard' });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authService.me).mockResolvedValue(testUser);
    vi.mocked(taskService.list).mockResolvedValue(paginated(tasks));
    vi.mocked(taskService.statistics).mockResolvedValue({ total: 2, completed: 1, pending: 1, trashed: 0 });
    vi.mocked(taskService.recentActivities).mockResolvedValue([
      { id: 9, taskId: 2, taskTitle: 'Call the bank', action: 'TASK_COMPLETED', createdAt: new Date().toISOString() },
    ]);
  });

  it('shows a loading indicator, then renders tasks, statistics and recent activity', async () => {
    renderDashboard();
    expect(screen.getByRole('status', { name: /loading tasks/i })).toBeInTheDocument();

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(within(list).getByRole('link', { name: 'Write report' })).toHaveAttribute('href', '/tasks/1');
    expect(within(list).getByText('Quarterly numbers')).toBeInTheDocument();
    expect(within(list).getByRole('checkbox', { name: /mark “call the bank” as pending/i })).toBeChecked();

    const stats = screen.getByRole('region', { name: 'Task statistics' });
    expect(await within(stats).findByText('50%')).toBeInTheDocument();

    const activity = screen.getByRole('region', { name: 'Recent activity' });
    expect(await within(activity).findByText('Call the bank')).toBeInTheDocument();
  });

  it('shows an empty state for a new user', async () => {
    vi.mocked(taskService.list).mockResolvedValue(paginated([]));
    renderDashboard();
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  });

  it('shows a "no matching tasks" state when filters exclude everything, with a way to clear them', async () => {
    vi.mocked(taskService.list).mockResolvedValue(paginated([]));
    renderDashboard('/dashboard?status=completed&search=zzz');

    expect(await screen.findByText('No matching tasks')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/dashboard$/));
  });

  it('shows an error state with a working retry', async () => {
    vi.mocked(taskService.list).mockRejectedValueOnce(apiError(500, 'An unexpected error occurred.'));
    renderDashboard();

    expect(await screen.findByText('Couldn’t load your tasks')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('list', { name: 'Tasks' })).toBeInTheDocument();
  });

  it('filters by status and resets to page 1', async () => {
    renderDashboard('/dashboard?page=2');
    await screen.findByRole('list', { name: 'Tasks' });
    expect(taskService.list).toHaveBeenLastCalledWith({ search: undefined, status: 'all', page: 2, perPage: 10 });

    await userEvent.click(screen.getByRole('button', { name: 'Pending' }));

    await waitFor(() =>
      expect(taskService.list).toHaveBeenLastCalledWith({ search: undefined, status: 'pending', page: 1, perPage: 10 }),
    );
    expect(screen.getByRole('button', { name: 'Pending' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard?status=pending');
  });

  it('searches by title after the user stops typing', async () => {
    renderDashboard();
    await screen.findByRole('list', { name: 'Tasks' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search tasks by title' }), 'report');

    await waitFor(() =>
      expect(taskService.list).toHaveBeenLastCalledWith({ search: 'report', status: 'all', page: 1, perPage: 10 }),
    );
    // Debounced: no request per keystroke.
    expect(vi.mocked(taskService.list).mock.calls.some(([params]) => params.search === 'r')).toBe(false);
  });

  it('toggles completion when the checkbox is clicked', async () => {
    vi.mocked(taskService.toggleCompletion).mockResolvedValue({ ...tasks[0]!, isCompleted: true });
    renderDashboard();

    await userEvent.click(await screen.findByRole('checkbox', { name: /mark “write report” as completed/i }));

    expect(taskService.toggleCompletion).toHaveBeenCalledWith(1);
    expect(await screen.findByText('“Write report” completed. Nice work!')).toBeInTheDocument();
    // Lists and statistics are refetched after the mutation.
    await waitFor(() => expect(taskService.statistics).toHaveBeenCalledTimes(2));
  });

  it('asks for confirmation before deleting, and does nothing on cancel', async () => {
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete “Write report”' }));

    const dialog = screen.getByRole('dialog', { name: 'Move task to trash?' });
    expect(dialog).toHaveTextContent('“Write report” will be moved to the trash.');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(taskService.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes the task after confirmation', async () => {
    vi.mocked(taskService.remove).mockResolvedValue(undefined);
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete “Write report”' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move to trash' }));

    expect(taskService.remove).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Task moved to trash.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('creates a task through the modal form', async () => {
    vi.mocked(taskService.create).mockResolvedValue(makeTask({ id: 3, title: 'New task' }));
    renderDashboard();
    await screen.findByRole('list', { name: 'Tasks' });

    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    const dialog = screen.getByRole('dialog', { name: 'New task' });
    await userEvent.type(within(dialog).getByLabelText('Title'), 'New task');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(taskService.create).toHaveBeenCalledWith({ title: 'New task', description: null });
    expect(await screen.findByText('Task created successfully.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits a task through the modal form', async () => {
    vi.mocked(taskService.update).mockResolvedValue({ ...tasks[0]!, title: 'Write final report' });
    renderDashboard();
    await userEvent.click(await screen.findByRole('button', { name: 'Edit “Write report”' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    const title = within(dialog).getByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Write final report');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(taskService.update).toHaveBeenCalledWith(1, {
      title: 'Write final report',
      description: 'Quarterly numbers',
      isCompleted: false,
    });
    expect(await screen.findByText('Task updated successfully.')).toBeInTheDocument();
  });

  it('paginates', async () => {
    vi.mocked(taskService.list).mockResolvedValue(paginated(tasks, { total: 12, lastPage: 2 }));
    renderDashboard();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(taskService.list).toHaveBeenLastCalledWith({ search: undefined, status: 'all', page: 2, perPage: 10 }),
    );
  });
});
