import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { prisma } from '../src/config/database.js';
import { DEFAULT_PASSWORD, app, apiClient, fetchCsrfToken, guestClient, registeredClient } from './helpers.js';

const validRegistration = {
  name: 'Jane Doe',
  email: 'Jane@Example.com',
  password: 'password123',
  passwordConfirmation: 'password123',
};

describe('POST /api/auth/register', () => {
  it('creates the user, hashes the password, and starts a session', async () => {
    const guest = await guestClient();
    const res = await guest.post('/api/auth/register', validRegistration).expect(201);

    expect(res.body).toMatchObject({
      success: true,
      message: 'Registration successful.',
      data: { name: 'Jane Doe', email: 'jane@example.com', emailVerifiedAt: null },
    });
    expect(res.body.data).not.toHaveProperty('password');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'jane@example.com' } });
    expect(stored.password).not.toBe(validRegistration.password);
    expect(stored.password).toMatch(/^\$2[aby]\$/);

    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toMatch(/^tm\.sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    await guest.get('/api/auth/me').expect(200);
  });

  it('rejects a duplicate email (case-insensitive) with a field error', async () => {
    await (await guestClient()).post('/api/auth/register', validRegistration).expect(201);

    const res = await (
      await guestClient()
    )
      .post('/api/auth/register', { ...validRegistration, email: 'JANE@example.com' })
      .expect(422);
    expect(res.body).toEqual({
      success: false,
      message: 'Validation failed.',
      errors: { email: ['The email has already been taken.'] },
    });
  });

  it('validates required fields, email format, password length and confirmation', async () => {
    const guest = await guestClient();
    const res = await guest
      .post('/api/auth/register', { email: 'not-an-email', password: 'short', passwordConfirmation: 'different' })
      .expect(422);

    expect(res.body.errors).toMatchObject({
      name: ['The name field is required.'],
      email: ['The email must be a valid email address.'],
      password: ['The password must be at least 8 characters.'],
    });

    const mismatch = await guest
      .post('/api/auth/register', { ...validRegistration, passwordConfirmation: 'password124' })
      .expect(422);
    expect(mismatch.body.errors).toEqual({ passwordConfirmation: ['The password confirmation does not match.'] });
  });

  it('rejects passwords longer than 72 bytes (bcrypt limit)', async () => {
    const longPassword = 'a'.repeat(73);
    const res = await (
      await guestClient()
    )
      .post('/api/auth/register', { ...validRegistration, password: longPassword, passwordConfirmation: longPassword })
      .expect(422);
    expect(res.body.errors.password).toEqual(['The password must not be greater than 72 bytes.']);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and regenerates the session ID', async () => {
    const { user } = await registeredClient({ email: 'login@example.com' });

    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/auth/csrf').expect(200);
    const sessionBefore = csrfRes.headers['set-cookie']?.[0]?.split(';')[0];
    expect(sessionBefore).toMatch(/^tm\.sid=.+/);
    const guest = apiClient(agent, csrfRes.body.data.csrfToken);

    const res = await guest
      .post('/api/auth/login', { email: 'LOGIN@example.com', password: DEFAULT_PASSWORD })
      .expect(200);
    const sessionAfter = res.headers['set-cookie']?.[0]?.split(';')[0];

    expect(res.body.data).toMatchObject({ id: user.id, email: 'login@example.com' });
    expect(sessionAfter).toMatch(/^tm\.sid=.+/);
    expect(sessionAfter).not.toBe(sessionBefore);

    const me = await guest.get('/api/auth/me').expect(200);
    expect(me.body.data.id).toBe(user.id);
  });

  it('invalidates the pre-login CSRF token after login', async () => {
    await registeredClient({ email: 'csrf@example.com' });
    const guest = await guestClient();
    await guest.post('/api/auth/login', { email: 'csrf@example.com', password: DEFAULT_PASSWORD }).expect(200);

    // The old token belonged to the pre-login session.
    await guest.post('/api/tasks', { title: 'x' }).expect(403);

    const fresh = apiClient(guest.agent, await fetchCsrfToken(guest.agent));
    await fresh.post('/api/tasks', { title: 'x' }).expect(201);
  });

  it('returns the same generic error for a wrong password and an unknown email', async () => {
    await registeredClient({ email: 'known@example.com' });
    const guest = await guestClient();

    const wrongPassword = await guest
      .post('/api/auth/login', { email: 'known@example.com', password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await guest
      .post('/api/auth/login', { email: 'unknown@example.com', password: 'wrong-password' })
      .expect(401);

    const expected = { success: false, message: 'These credentials do not match our records.' };
    expect(wrongPassword.body).toEqual(expected);
    expect(unknownEmail.body).toEqual(expected);
    await guest.get('/api/auth/me').expect(401);
  });

  it('validates login input', async () => {
    const res = await (await guestClient()).post('/api/auth/login', {}).expect(422);
    expect(res.body.errors).toEqual({
      email: ['The email field is required.'],
      password: ['The password field is required.'],
    });
  });
});

describe('POST /api/auth/logout', () => {
  it('destroys the session so the old cookie no longer authenticates', async () => {
    const { client } = await registeredClient();
    const sessionsBefore = await prisma.session.count();

    const res = await client.post('/api/auth/logout').expect(200);
    expect(res.body).toMatchObject({ success: true, message: 'Logged out successfully.' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/tm\.sid=;/);
    expect(await prisma.session.count()).toBe(sessionsBefore - 1);

    await client.get('/api/auth/me').expect(401);
    await client.get('/api/tasks').expect(401);
  });

  it('requires a CSRF token', async () => {
    const { client } = await registeredClient();
    await client.agent.post('/api/auth/logout').expect(403);
    await client.get('/api/auth/me').expect(200);
  });
});

describe('protected routes', () => {
  it('reject requests without a session', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);
    expect(res.body).toEqual({ success: false, message: 'Unauthenticated.' });

    await request(app).get('/api/tasks').expect(401);
    await request(app).get('/api/tasks/statistics').expect(401);
    await request(app).get('/api/activities/recent').expect(401);
  });

  it('reject a session whose user no longer exists', async () => {
    const { client, user } = await registeredClient();
    await prisma.user.delete({ where: { id: user.id } });
    await client.get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me returns the authenticated user without the password', async () => {
    const { client, user } = await registeredClient({ name: 'Profile User' });
    const res = await client.get('/api/auth/me').expect(200);
    expect(res.body.data).toEqual({
      id: user.id,
      name: 'Profile User',
      email: user.email,
      emailVerifiedAt: null,
      createdAt: expect.any(String),
    });
  });
});
