import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taskService } from '../services/taskService';
import { makeTask, paginated, renderWithProviders } from '../test/utils';
import { TrashPage } from './TrashPage';

vi.mock('../services/taskService', () => ({
  taskService: { trash: vi.fn(), restore: vi.fn(), forceDelete: vi.fn() },
}));

const trashed = makeTask({ id: 5, title: 'Old idea', deletedAt: '2026-11-15T10:00:00.000Z' });

describe('TrashPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(taskService.trash).mockResolvedValue(paginated([trashed]));
  });

  it('shows an empty state when the trash is empty', async () => {
    vi.mocked(taskService.trash).mockResolvedValue(paginated([]));
    renderWithProviders(<TrashPage />);
    expect(await screen.findByText('Trash is empty')).toBeInTheDocument();
  });

  it('restores a task', async () => {
    vi.mocked(taskService.restore).mockResolvedValue({ ...trashed, deletedAt: null });
    renderWithProviders(<TrashPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Restore “Old idea”' }));
    expect(taskService.restore).toHaveBeenCalledWith(5);
    expect(await screen.findByText('“Old idea” restored.')).toBeInTheDocument();
  });

  it('requires confirmation before permanently deleting', async () => {
    vi.mocked(taskService.forceDelete).mockResolvedValue(undefined);
    renderWithProviders(<TrashPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete “Old idea” forever' }));
    expect(taskService.forceDelete).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog', { name: 'Delete permanently?' });
    expect(dialog).toHaveTextContent('This cannot be undone.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete forever' }));

    expect(taskService.forceDelete).toHaveBeenCalledWith(5);
    expect(await screen.findByText('Task permanently deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
