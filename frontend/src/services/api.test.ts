import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, getErrorMessage, getFieldErrors, resetCsrfToken, setUnauthenticatedHandler } from './api';

/** A fake transport so the real interceptors run without a network. */
function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response = { config, status, statusText: '', headers: {}, data } as AxiosResponse;
  if (status >= 400) {
    const error = Object.assign(new Error(`Request failed with status code ${status}`), {
      isAxiosError: true,
      config,
      response,
    });
    return Promise.reject(error);
  }
  return Promise.resolve(response);
}

let csrfCalls = 0;
let originalAdapter: typeof api.defaults.adapter;

beforeEach(() => {
  csrfCalls = 0;
  resetCsrfToken();
  originalAdapter = api.defaults.adapter;
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  setUnauthenticatedHandler(() => undefined);
});

function useAdapter(handler: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>) {
  const adapter = vi.fn<AxiosAdapter>((config) => {
    if (config.url === '/auth/csrf') {
      csrfCalls += 1;
      return respond(config, 200, { data: { csrfToken: `token-${csrfCalls}` } });
    }
    return handler(config);
  });
  api.defaults.adapter = adapter;
  return adapter;
}

describe('api client', () => {
  it('sends cookies with every request', () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it('attaches a CSRF token to state-changing requests only, fetching it once', async () => {
    const adapter = useAdapter((config) => respond(config, 200, { data: null }));

    await api.get('/tasks');
    await api.post('/tasks', { title: 'a' });
    await api.patch('/tasks/1', { title: 'b' });

    const calls = adapter.mock.calls.map(([config]) => [config.method, config.url, config.headers['X-CSRF-Token']]);
    expect(calls).toEqual([
      ['get', '/tasks', undefined],
      ['get', '/auth/csrf', undefined],
      ['post', '/tasks', 'token-1'],
      ['patch', '/tasks/1', 'token-1'],
    ]);
  });

  it('fetches a new token after resetCsrfToken (e.g. after login)', async () => {
    useAdapter((config) => respond(config, 200, { data: null }));
    await api.post('/tasks');
    resetCsrfToken();
    await api.post('/tasks');
    expect(csrfCalls).toBe(2);
  });

  it('refreshes the token and retries once when the server rejects it with 403', async () => {
    let attempts = 0;
    useAdapter((config) => {
      attempts += 1;
      return config.headers['X-CSRF-Token'] === 'token-2'
        ? respond(config, 201, { data: 'ok' })
        : respond(config, 403, { success: false, message: 'Invalid or missing CSRF token.' });
    });

    const res = await api.post('/tasks', { title: 'x' });
    expect(res.status).toBe(201);
    expect(attempts).toBe(2);
  });

  it('does not retry forever when 403 persists', async () => {
    let attempts = 0;
    useAdapter((config) => {
      attempts += 1;
      return respond(config, 403, { success: false, message: 'Invalid or missing CSRF token.' });
    });

    await expect(api.post('/tasks')).rejects.toBeDefined();
    expect(attempts).toBe(2);
  });

  it('calls the unauthenticated handler on 401 from protected endpoints, but not from login', async () => {
    const handler = vi.fn();
    setUnauthenticatedHandler(handler);
    useAdapter((config) => respond(config, 401, { success: false, message: 'Unauthenticated.' }));

    await expect(api.post('/auth/login', {})).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();

    await expect(api.get('/tasks')).rejects.toBeDefined();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('extracts messages and field errors from API errors', async () => {
    useAdapter((config) =>
      respond(config, 422, { success: false, message: 'Validation failed.', errors: { title: ['Required.'] } }),
    );
    const error = await api.post('/tasks').catch((e: unknown) => e);

    expect(getErrorMessage(error)).toBe('Validation failed.');
    expect(getFieldErrors(error)).toEqual({ title: ['Required.'] });
    expect(getFieldErrors(new Error('boom'))).toBeNull();
    expect(getErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
