import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { ToastProvider } from '../components/common/Toast';
import type { Paginated } from '../types/api';
import type { User } from '../types/auth';
import type { Task } from '../types/task';

/** Renders the current location so tests can assert on navigation. */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

interface RenderOptions {
  route?: string;
  path?: string;
  /** Extra routes rendered next to the component (e.g. navigation targets). */
  routes?: ReactElement[];
}

export function renderWithProviders(ui: ReactElement, { route = '/', path = '*', routes = [] }: RenderOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path={path} element={ui} />
            {routes}
          </Routes>
          <LocationDisplay />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
}

export function makeTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? 1;
  return {
    id,
    userId: 1,
    title: `Task ${id}`,
    description: null,
    isCompleted: false,
    createdAt: '2026-11-16T10:00:00.000Z',
    updatedAt: '2026-11-16T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

export function paginated(tasks: Task[], overrides: Partial<Paginated<Task>['meta']> = {}): Paginated<Task> {
  return {
    data: tasks,
    meta: { currentPage: 1, perPage: 10, total: tasks.length, lastPage: 1, ...overrides },
  };
}

export const testUser: User = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  emailVerifiedAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
};

/** Builds an Axios error shaped like the API's error responses. */
export function apiError(status: number, message: string, errors?: Record<string, string[]>): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(message, String(status), { headers }, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers },
    data: { success: false, message, ...(errors && { errors }) },
  });
}
