import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/common/Toast';
import { authService } from '../services/authService';
import { taskService } from '../services/taskService';
import { paginated, testUser } from '../test/utils';
import { AppRoutes } from './AppRoutes';

vi.mock('../services/authService', () => ({
  authService: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

vi.mock('../services/taskService', () => ({
  taskService: { list: vi.fn(), statistics: vi.fn(), recentActivities: vi.fn() },
}));

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('route guards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(taskService.list).mockResolvedValue(paginated([]));
    vi.mocked(taskService.statistics).mockResolvedValue({ total: 0, completed: 0, pending: 0, trashed: 0 });
    vi.mocked(taskService.recentActivities).mockResolvedValue([]);
  });

  it('redirects unauthenticated visitors from the dashboard to the login page', async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
  });

  it('shows the dashboard to an authenticated user', async () => {
    vi.mocked(authService.me).mockResolvedValue(testUser);
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: /, Jane$/ })).toBeInTheDocument();
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
  });

  it('sends an authenticated user away from the login page', async () => {
    vi.mocked(authService.me).mockResolvedValue(testUser);
    renderAt('/login');
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  });
});
