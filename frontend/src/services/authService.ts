import type { ApiSuccess } from '../types/api';
import type { LoginInput, RegisterInput, User } from '../types/auth';
import { api, isApiError, resetCsrfToken } from './api';

export const authService = {
  /** The current user, or null when there is no valid session. */
  async me(): Promise<User | null> {
    try {
      const res = await api.get<ApiSuccess<User>>('/auth/me');
      return res.data.data;
    } catch (error) {
      if (isApiError(error, 401)) return null;
      throw error;
    }
  },

  async login(input: LoginInput): Promise<User> {
    const res = await api.post<ApiSuccess<User>>('/auth/login', input);
    // The server regenerated the session, so the old CSRF token is no longer valid.
    resetCsrfToken();
    return res.data.data;
  },

  async register(input: RegisterInput): Promise<User> {
    const res = await api.post<ApiSuccess<User>>('/auth/register', input);
    resetCsrfToken();
    return res.data.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      resetCsrfToken();
    }
  },
};
