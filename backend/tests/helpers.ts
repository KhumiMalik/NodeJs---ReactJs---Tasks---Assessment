import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/database.js';

export const app = createApp();

export const DEFAULT_PASSWORD = 'password123';

type Agent = ReturnType<typeof request.agent>;

export async function fetchCsrfToken(agent: Agent): Promise<string> {
  const res = await agent.get('/api/auth/csrf').expect(200);
  return res.body.data.csrfToken as string;
}

/** Wraps a cookie-keeping agent so state-changing requests carry the CSRF header. */
export function apiClient(agent: Agent, csrfToken: string) {
  return {
    agent,
    get: (url: string) => agent.get(url),
    post: (url: string, body?: object) => agent.post(url).set('X-CSRF-Token', csrfToken).send(body),
    put: (url: string, body?: object) => agent.put(url).set('X-CSRF-Token', csrfToken).send(body),
    patch: (url: string, body?: object) => agent.patch(url).set('X-CSRF-Token', csrfToken).send(body),
    delete: (url: string) => agent.delete(url).set('X-CSRF-Token', csrfToken),
  };
}

export type ApiClient = ReturnType<typeof apiClient>;

/** A client with a fresh (unauthenticated) session and a valid CSRF token. */
export async function guestClient(): Promise<ApiClient> {
  const agent = request.agent(app);
  return apiClient(agent, await fetchCsrfToken(agent));
}

let userCounter = 0;

/** Registers a new user through the API and returns an authenticated client. */
export async function registeredClient(overrides: { name?: string; email?: string } = {}) {
  userCounter += 1;
  const credentials = {
    name: overrides.name ?? `User ${userCounter}`,
    email: overrides.email ?? `user${userCounter}-${Date.now()}@example.com`,
    password: DEFAULT_PASSWORD,
    passwordConfirmation: DEFAULT_PASSWORD,
  };

  const guest = await guestClient();
  const res = await guest.post('/api/auth/register', credentials).expect(201);

  // Registration regenerates the session, which invalidates the previous CSRF token.
  const client = apiClient(guest.agent, await fetchCsrfToken(guest.agent));
  return { client, user: res.body.data as { id: number; email: string; name: string } };
}

export function createTaskFor(
  userId: number,
  data: { title?: string; description?: string | null; isCompleted?: boolean; deletedAt?: Date | null } = {},
) {
  return prisma.task.create({
    data: {
      userId,
      title: data.title ?? 'Sample task',
      description: data.description ?? null,
      isCompleted: data.isCompleted ?? false,
      deletedAt: data.deletedAt ?? null,
    },
  });
}
