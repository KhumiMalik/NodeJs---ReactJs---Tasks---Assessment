import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/config/database.js';
import { createTaskFor, registeredClient, type ApiClient } from './helpers.js';

let client: ApiClient;
let userId: number;

beforeEach(async () => {
  const registered = await registeredClient();
  client = registered.client;
  userId = registered.user.id;
});

describe('POST /api/tasks', () => {
  it('creates a pending task owned by the authenticated user', async () => {
    const res = await client.post('/api/tasks', { title: '  Write report  ', description: 'Quarterly' }).expect(201);

    expect(res.body).toMatchObject({
      success: true,
      message: 'Task created successfully.',
      data: { title: 'Write report', description: 'Quarterly', isCompleted: false, userId, deletedAt: null },
    });
    expect(await prisma.task.count({ where: { userId } })).toBe(1);
  });

  it('stores a blank description as null and accepts isCompleted', async () => {
    const res = await client.post('/api/tasks', { title: 'Done already', description: '   ', isCompleted: true });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ description: null, isCompleted: true });
  });
});

describe('GET /api/tasks', () => {
  it('lists only active tasks, newest first, with pagination metadata', async () => {
    const older = await createTaskFor(userId, { title: 'Older' });
    await prisma.task.update({ where: { id: older.id }, data: { createdAt: new Date(Date.now() - 60_000) } });
    await createTaskFor(userId, { title: 'Newer' });
    await createTaskFor(userId, { title: 'Trashed', deletedAt: new Date() });

    const res = await client.get('/api/tasks').expect(200);
    expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(['Newer', 'Older']);
    expect(res.body.meta).toEqual({ currentPage: 1, perPage: 10, total: 2, lastPage: 1 });
  });

  it('paginates results', async () => {
    for (let i = 1; i <= 7; i++) {
      await createTaskFor(userId, { title: `Task ${i}` });
    }

    const page1 = await client.get('/api/tasks?perPage=3&page=1').expect(200);
    const page3 = await client.get('/api/tasks?perPage=3&page=3').expect(200);
    const beyond = await client.get('/api/tasks?perPage=3&page=4').expect(200);

    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.meta).toEqual({ currentPage: 1, perPage: 3, total: 7, lastPage: 3 });
    expect(page3.body.data).toHaveLength(1);
    expect(beyond.body.data).toEqual([]);

    const allIds = new Set(
      [page1, page3, await client.get('/api/tasks?perPage=3&page=2')].flatMap((r) =>
        r.body.data.map((t: { id: number }) => t.id),
      ),
    );
    expect(allIds.size).toBe(7);
  });

  it('searches by title case-insensitively', async () => {
    await createTaskFor(userId, { title: 'Learn Laravel' });
    await createTaskFor(userId, { title: 'laravel queues' });
    await createTaskFor(userId, { title: 'Buy milk' });

    const res = await client.get('/api/tasks?search=LARAVEL').expect(200);
    expect(res.body.data.map((t: { title: string }) => t.title).sort()).toEqual(['Learn Laravel', 'laravel queues']);
    expect(res.body.meta.total).toBe(2);
  });

  it('treats LIKE wildcards in the search term literally', async () => {
    await createTaskFor(userId, { title: '100% done' });
    await createTaskFor(userId, { title: '1000 items' });
    await createTaskFor(userId, { title: 'snake_case' });
    await createTaskFor(userId, { title: 'snakeXcase' });

    const percent = await client.get(`/api/tasks?search=${encodeURIComponent('100%')}`).expect(200);
    expect(percent.body.data.map((t: { title: string }) => t.title)).toEqual(['100% done']);

    const underscore = await client.get('/api/tasks?search=snake_').expect(200);
    expect(underscore.body.data.map((t: { title: string }) => t.title)).toEqual(['snake_case']);

    await createTaskFor(userId, { title: 'C:\\temp folder' });
    const backslash = await client.get(`/api/tasks?search=${encodeURIComponent('C:\\temp')}`).expect(200);
    expect(backslash.body.data.map((t: { title: string }) => t.title)).toEqual(['C:\\temp folder']);
  });

  it('filters by pending and completed status', async () => {
    await createTaskFor(userId, { title: 'Pending task' });
    await createTaskFor(userId, { title: 'Completed task', isCompleted: true });

    const pending = await client.get('/api/tasks?status=pending').expect(200);
    const completed = await client.get('/api/tasks?status=completed').expect(200);
    const all = await client.get('/api/tasks?status=all').expect(200);

    expect(pending.body.data.map((t: { title: string }) => t.title)).toEqual(['Pending task']);
    expect(completed.body.data.map((t: { title: string }) => t.title)).toEqual(['Completed task']);
    expect(all.body.meta.total).toBe(2);
  });

  it('combines search, status and pagination', async () => {
    await createTaskFor(userId, { title: 'Report A', isCompleted: true });
    await createTaskFor(userId, { title: 'Report B' });
    await createTaskFor(userId, { title: 'Report C' });
    await createTaskFor(userId, { title: 'Other' });

    const res = await client.get('/api/tasks?search=report&status=pending&perPage=1&page=2').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ currentPage: 2, perPage: 1, total: 2, lastPage: 2 });
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns the task', async () => {
    const task = await createTaskFor(userId, { title: 'Details', description: 'More info' });
    const res = await client.get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body.data).toMatchObject({ id: task.id, title: 'Details', description: 'More info' });
  });

  it('returns 404 for missing and trashed tasks', async () => {
    const trashed = await createTaskFor(userId, { deletedAt: new Date() });
    await client.get('/api/tasks/999999').expect(404);
    const res = await client.get(`/api/tasks/${trashed.id}`).expect(404);
    expect(res.body).toEqual({ success: false, message: 'Task not found.' });
  });
});

describe('PATCH and PUT /api/tasks/:id', () => {
  it('PATCH updates only the provided fields', async () => {
    const task = await createTaskFor(userId, { title: 'Original', description: 'Keep me' });
    const res = await client.patch(`/api/tasks/${task.id}`, { title: 'Renamed' }).expect(200);
    expect(res.body.data).toMatchObject({ title: 'Renamed', description: 'Keep me', isCompleted: false });
  });

  it('PATCH can clear the description with null', async () => {
    const task = await createTaskFor(userId, { description: 'Remove me' });
    const res = await client.patch(`/api/tasks/${task.id}`, { description: null }).expect(200);
    expect(res.body.data.description).toBeNull();
  });

  it('PUT replaces all editable fields', async () => {
    const task = await createTaskFor(userId, { title: 'Original', description: 'Old', isCompleted: true });
    const res = await client.put(`/api/tasks/${task.id}`, { title: 'Replaced' }).expect(200);
    expect(res.body.data).toMatchObject({ title: 'Replaced', description: null, isCompleted: false });
  });

  it('PUT requires a title', async () => {
    const task = await createTaskFor(userId);
    const res = await client.put(`/api/tasks/${task.id}`, { description: 'No title' }).expect(422);
    expect(res.body.errors).toEqual({ title: ['The title field is required.'] });
  });

  it('cannot update a trashed task', async () => {
    const task = await createTaskFor(userId, { deletedAt: new Date() });
    await client.patch(`/api/tasks/${task.id}`, { title: 'Nope' }).expect(404);
  });
});

describe('PATCH /api/tasks/:id/toggle-completion', () => {
  it('toggles pending to completed and back', async () => {
    const task = await createTaskFor(userId);

    const completed = await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);
    expect(completed.body).toMatchObject({ message: 'Task marked as completed.', data: { isCompleted: true } });

    const pending = await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);
    expect(pending.body).toMatchObject({ message: 'Task marked as pending.', data: { isCompleted: false } });
  });
});

describe('DELETE /api/tasks/:id (soft delete) and trash', () => {
  it('moves the task to the trash and hides it from the normal listing', async () => {
    const task = await createTaskFor(userId, { title: 'To trash' });

    const res = await client.delete(`/api/tasks/${task.id}`).expect(204);
    expect(res.text).toBe('');

    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.deletedAt).not.toBeNull();

    const list = await client.get('/api/tasks').expect(200);
    expect(list.body.data).toEqual([]);

    const trash = await client.get('/api/tasks/trash').expect(200);
    expect(trash.body.data.map((t: { id: number }) => t.id)).toEqual([task.id]);
    expect(trash.body.meta).toEqual({ currentPage: 1, perPage: 10, total: 1, lastPage: 1 });
  });

  it('returns 404 when deleting a task that is already trashed', async () => {
    const task = await createTaskFor(userId, { deletedAt: new Date() });
    await client.delete(`/api/tasks/${task.id}`).expect(404);
  });
});

describe('POST /api/tasks/:id/restore', () => {
  it('restores a trashed task so it reappears in the listing', async () => {
    const task = await createTaskFor(userId, { title: 'Restore me', deletedAt: new Date() });

    const res = await client.post(`/api/tasks/${task.id}/restore`).expect(200);
    expect(res.body).toMatchObject({ message: 'Task restored successfully.', data: { id: task.id, deletedAt: null } });

    const list = await client.get('/api/tasks').expect(200);
    expect(list.body.data.map((t: { id: number }) => t.id)).toEqual([task.id]);
    const trash = await client.get('/api/tasks/trash').expect(200);
    expect(trash.body.data).toEqual([]);
  });

  it('rejects restoring a task that is not in the trash with 409', async () => {
    const task = await createTaskFor(userId);
    const res = await client.post(`/api/tasks/${task.id}/restore`).expect(409);
    expect(res.body).toEqual({ success: false, message: 'Only tasks in the trash can be restored.' });
  });
});

describe('DELETE /api/tasks/:id/force-delete', () => {
  it('permanently deletes a trashed task', async () => {
    const task = await createTaskFor(userId, { deletedAt: new Date() });
    await client.delete(`/api/tasks/${task.id}/force-delete`).expect(204);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });

  it('refuses to permanently delete an active task', async () => {
    const task = await createTaskFor(userId);
    const res = await client.delete(`/api/tasks/${task.id}/force-delete`).expect(409);
    expect(res.body.message).toBe('Only tasks in the trash can be permanently deleted.');
    expect(await prisma.task.findUnique({ where: { id: task.id } })).not.toBeNull();
  });
});

describe('GET /api/tasks/statistics', () => {
  it('counts active tasks by status plus trashed tasks, for the current user only', async () => {
    await createTaskFor(userId, { isCompleted: true });
    await createTaskFor(userId, { isCompleted: true });
    await createTaskFor(userId);
    await createTaskFor(userId, { isCompleted: true, deletedAt: new Date() });

    const other = await registeredClient();
    await createTaskFor(other.user.id);
    await createTaskFor(other.user.id, { isCompleted: true });

    const res = await client.get('/api/tasks/statistics').expect(200);
    expect(res.body.data).toEqual({ total: 3, completed: 2, pending: 1, trashed: 1 });
  });

  it('returns zeros for a user with no tasks', async () => {
    const res = await client.get('/api/tasks/statistics').expect(200);
    expect(res.body.data).toEqual({ total: 0, completed: 0, pending: 0, trashed: 0 });
  });
});
