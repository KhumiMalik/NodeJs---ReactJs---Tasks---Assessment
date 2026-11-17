import { beforeEach, describe, expect, it } from 'vitest';
import { createTaskFor, registeredClient, type ApiClient } from './helpers.js';

let client: ApiClient;
let userId: number;

beforeEach(async () => {
  const registered = await registeredClient();
  client = registered.client;
  userId = registered.user.id;
});

describe('create task validation', () => {
  it('requires a title', async () => {
    const res = await client.post('/api/tasks', {}).expect(422);
    expect(res.body).toEqual({
      success: false,
      message: 'Validation failed.',
      errors: { title: ['The title field is required.'] },
    });
  });

  it('rejects a whitespace-only title', async () => {
    const res = await client.post('/api/tasks', { title: '   ' }).expect(422);
    expect(res.body.errors.title).toEqual(['The title field is required.']);
  });

  it('accepts a 255-character title and rejects 256', async () => {
    await client.post('/api/tasks', { title: 'a'.repeat(255) }).expect(201);
    const res = await client.post('/api/tasks', { title: 'a'.repeat(256) }).expect(422);
    expect(res.body.errors.title).toEqual(['The title must not be greater than 255 characters.']);
  });

  it('accepts a 5000-character description and rejects 5001', async () => {
    await client.post('/api/tasks', { title: 'ok', description: 'd'.repeat(5000) }).expect(201);
    const res = await client.post('/api/tasks', { title: 'ok', description: 'd'.repeat(5001) }).expect(422);
    expect(res.body.errors.description).toEqual(['The description must not be greater than 5000 characters.']);
  });

  it('rejects wrong types', async () => {
    const res = await client.post('/api/tasks', { title: 123, description: false, isCompleted: 'yes' }).expect(422);
    expect(res.body.errors).toEqual({
      title: ['The title must be a string.'],
      description: ['The description must be a string.'],
      isCompleted: ['The is completed field must be true or false.'],
    });
  });

  it('rejects a non-object body', async () => {
    const res = await client.post('/api/tasks', ['not', 'an', 'object']).expect(422);
    expect(res.body.success).toBe(false);
  });
});

describe('update task validation', () => {
  it('rejects an empty update', async () => {
    const task = await createTaskFor(userId);
    const res = await client.patch(`/api/tasks/${task.id}`, {}).expect(422);
    expect(res.body.errors).toEqual({
      body: ['At least one of title, description or isCompleted must be provided.'],
    });
  });

  it('rejects an empty title when provided', async () => {
    const task = await createTaskFor(userId);
    const res = await client.patch(`/api/tasks/${task.id}`, { title: '' }).expect(422);
    expect(res.body.errors.title).toEqual(['The title field is required.']);
  });

  it('rejects null for title', async () => {
    const task = await createTaskFor(userId);
    await client.patch(`/api/tasks/${task.id}`, { title: null }).expect(422);
  });
});

describe('route parameter validation', () => {
  it.each(['abc', '0', '-1', '1.5', '99999999999'])('rejects id "%s" with 422', async (id) => {
    const res = await client.get(`/api/tasks/${id}`).expect(422);
    expect(res.body.errors).toHaveProperty('id');
  });
});

describe('list query validation', () => {
  it.each([
    ['status=done', 'status'],
    ['page=0', 'page'],
    ['page=abc', 'page'],
    ['perPage=0', 'perPage'],
    ['perPage=51', 'perPage'],
    [`search=${'s'.repeat(256)}`, 'search'],
    ['status=pending&status=completed', 'status'],
  ])('rejects "%s"', async (query, field) => {
    const res = await client.get(`/api/tasks?${query}`).expect(422);
    expect(res.body.errors).toHaveProperty(field);
  });

  it('accepts boundary values perPage=1 and perPage=50', async () => {
    await client.get('/api/tasks?perPage=1').expect(200);
    const res = await client.get('/api/tasks?perPage=50').expect(200);
    expect(res.body.meta.perPage).toBe(50);
  });

  it('treats an empty search as no search', async () => {
    await createTaskFor(userId, { title: 'Anything' });
    const res = await client.get('/api/tasks?search=').expect(200);
    expect(res.body.meta.total).toBe(1);
  });
});
