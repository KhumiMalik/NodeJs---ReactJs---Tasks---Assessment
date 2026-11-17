import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/authService';
import { apiError, renderWithProviders, testUser } from '../test/utils';
import { LoginPage } from './LoginPage';

vi.mock('../services/authService', () => ({
  authService: { login: vi.fn(), me: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

function renderLogin() {
  return renderWithProviders(<LoginPage />, {
    route: '/login',
    path: '/login',
    routes: [<Route key="dashboard" path="/dashboard" element={<h1>Dashboard</h1>} />],
  });
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows field errors and does not call the API when the form is empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('The email field is required.')).toBeInTheDocument();
    expect(screen.getByText('The password field is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('validates the email format', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText('Email address'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('The email must be a valid email address.')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('logs in, shows a welcome toast, and navigates to the dashboard', async () => {
    vi.mocked(authService.login).mockResolvedValue(testUser);
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(authService.login).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'password123' });
    expect(screen.getByText('Welcome back, Jane Doe!')).toBeInTheDocument();
  });

  it('shows the generic error message on invalid credentials', async () => {
    vi.mocked(authService.login).mockRejectedValue(apiError(401, 'These credentials do not match our records.'));
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('These credentials do not match our records.');
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolve: (user: typeof testUser) => void = () => undefined;
    vi.mocked(authService.login).mockReturnValue(new Promise((r) => (resolve = r)));
    renderLogin();

    await userEvent.type(screen.getByLabelText('Email address'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled();
    resolve(testUser);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
