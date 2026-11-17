import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/authService';
import { apiError, renderWithProviders, testUser } from '../test/utils';
import { RegisterPage } from './RegisterPage';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), me: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

function renderRegister() {
  return renderWithProviders(<RegisterPage />, {
    route: '/register',
    path: '/register',
    routes: [<Route key="dashboard" path="/dashboard" element={<h1>Dashboard</h1>} />],
  });
}

async function fillForm(overrides: Partial<Record<'name' | 'email' | 'password' | 'confirm', string>> = {}) {
  const values = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    confirm: 'password123',
    ...overrides,
  };
  if (values.name) await userEvent.type(screen.getByLabelText('Full name'), values.name);
  if (values.email) await userEvent.type(screen.getByLabelText('Email address'), values.email);
  if (values.password) await userEvent.type(screen.getByLabelText('Password'), values.password);
  if (values.confirm) await userEvent.type(screen.getByLabelText('Confirm password'), values.confirm);
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('validates required fields, password length and confirmation on the client', async () => {
    renderRegister();
    await fillForm({ name: '', password: 'short', confirm: 'different' });
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('The name field is required.')).toBeInTheDocument();
    expect(screen.getByText('The password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('The password confirmation does not match.')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('registers and navigates to the dashboard', async () => {
    vi.mocked(authService.register).mockResolvedValue(testUser);
    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(authService.register).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      passwordConfirmation: 'password123',
    });
  });

  it('shows server-side field errors next to the field (e.g. email taken)', async () => {
    vi.mocked(authService.register).mockRejectedValue(
      apiError(422, 'Validation failed.', { email: ['The email has already been taken.'] }),
    );
    renderRegister();
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });
});
