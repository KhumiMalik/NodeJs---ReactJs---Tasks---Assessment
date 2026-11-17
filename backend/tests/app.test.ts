import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, guestClient } from './helpers.js';

describe('application', () => {
  it('responds to the health check', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({ success: true, message: 'OK' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    expect(res.body).toEqual({ success: false, message: 'Route not found.' });
  });

  it('rejects state-changing requests without a CSRF token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, message: 'Invalid or missing CSRF token.' });
  });

  it('rejects a CSRF token that belongs to a different session', async () => {
    const other = await guestClient();
    const token = (await other.get('/api/auth/csrf')).body.data.csrfToken as string;

    const res = await request(app)
      .post('/api/auth/login')
      .set('X-CSRF-Token', token)
      .send({ email: 'a@example.com', password: 'x' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for malformed JSON without leaking parser details', async () => {
    const guest = await guestClient();
    const res = await guest.agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', (await guest.get('/api/auth/csrf')).body.data.csrfToken)
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Malformed JSON request body.' });
  });

  it('sets security headers and allows credentialed CORS only for the configured origin', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');

    const denied = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
