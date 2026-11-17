import type { AxiosError } from 'axios';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from '../types/api';

/**
 * Central Axios instance. `withCredentials` sends the HttpOnly session cookie;
 * nothing auth-related is ever stored in localStorage/sessionStorage.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);

// --- CSRF ---------------------------------------------------------------------
// The backend uses synchronizer tokens bound to the session. The token is fetched
// lazily before the first state-changing request and cached in memory. It must be
// reset whenever the session changes (login, register, logout).

let csrfToken: string | null = null;
let pendingCsrfRequest: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  pendingCsrfRequest ??= api
    .get<{ data: { csrfToken: string } }>('/auth/csrf')
    .then((res) => {
      csrfToken = res.data.data.csrfToken;
      return csrfToken;
    })
    .finally(() => {
      pendingCsrfRequest = null;
    });
  return pendingCsrfRequest;
}

export function resetCsrfToken(): void {
  csrfToken = null;
}

api.interceptors.request.use(async (config) => {
  if (!SAFE_METHODS.has((config.method ?? 'get').toLowerCase())) {
    config.headers.set('X-CSRF-Token', await getCsrfToken());
  }
  return config;
});

// --- Response handling ----------------------------------------------------------

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

let onUnauthenticated: (() => void) | null = null;

/** Registers what to do when the session has expired (e.g. clear the cached user). */
export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler;
}

// Endpoints where 401 is an expected answer rather than an expired session.
const AUTH_PROBE_URLS = ['/auth/me', '/auth/login'];

api.interceptors.response.use(undefined, async (error: AxiosError<ApiErrorBody>) => {
  const config = error.config as RetriableConfig | undefined;
  const status = error.response?.status;

  // 403 is only used for CSRF failures (e.g. the session expired and the cached
  // token is stale). Fetch a fresh token and retry the request once.
  if (status === 403 && config && !config._csrfRetried && !SAFE_METHODS.has((config.method ?? '').toLowerCase())) {
    config._csrfRetried = true;
    resetCsrfToken();
    return api(config);
  }

  if (status === 401 && config && !AUTH_PROBE_URLS.includes(config.url ?? '')) {
    resetCsrfToken();
    onUnauthenticated?.();
  }

  return Promise.reject(error);
});

// --- Error helpers -------------------------------------------------------------

export function isApiError(error: unknown, status?: number): error is AxiosError<ApiErrorBody> {
  return axios.isAxiosError(error) && (status === undefined || error.response?.status === status);
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Unable to reach the server. Check your connection and try again.';
    return error.response.data?.message || fallback;
  }
  return fallback;
}

/** Field errors from a 422 response, keyed by field name. */
export function getFieldErrors(error: unknown): Record<string, string[]> | null {
  if (isApiError(error, 422)) {
    return error.response?.data?.errors ?? null;
  }
  return null;
}
