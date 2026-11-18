import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/authService';
import { taskService } from '../../services/taskService';
import { renderWithProviders, testUser } from '../../test/utils';
import { AppLayout } from './AppLayout';

vi.mock('../../services/authService', () => ({
  authService: { me: vi.fn(), logout: vi.fn() },
}));

vi.mock('../../services/taskService', () => ({
  taskService: { statistics: vi.fn() },
}));

/** Page content that navigates without going through the drawer's own links. */
function PageWithLink() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/trash')}>
      Go to trash
    </button>
  );
}

function renderLayout() {
  return renderWithProviders(<AppLayout />, {
    route: '/dashboard',
    path: '/',
    routes: [
      <Route key="layout" element={<AppLayout />}>
        <Route path="/dashboard" element={<PageWithLink />} />
        <Route path="/trash" element={<p>Trash page</p>} />
      </Route>,
    ],
  });
}

describe('AppLayout mobile navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authService.me).mockResolvedValue(testUser);
    vi.mocked(taskService.statistics).mockResolvedValue({ total: 0, completed: 0, pending: 0, trashed: 0 });
  });

  it('links to every main page, including Weather', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(within(nav).getByRole('link', { name: /trash/i })).toHaveAttribute('href', '/trash');
    expect(within(nav).getByRole('link', { name: 'Weather' })).toHaveAttribute('href', '/weather');
  });

  it('opens the drawer and closes it with Escape', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument();
  });

  it('closes the drawer when the route changes', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Go to trash' }));
    expect(await screen.findByText('Trash page')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument();
  });
});
