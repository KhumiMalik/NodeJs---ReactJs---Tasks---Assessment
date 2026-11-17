import { beforeEach, describe, expect, it } from 'vitest';
import type { Task } from '../src/generated/prisma/client.js';
import { prisma } from '../src/config/database.js';
import { createTaskFor, registeredClient, type ApiClient } from './helpers.js';

/**
 * Policy: another user's task is reported as 404 Not Found (not 403), so the API
 * never reveals whether a task ID exists. Every case below also checks that the
 * victim's data is unchanged.
 */
let userA: ApiClient;
let userAId: number;
let userBId: number;
let taskB: Task;
let trashedTaskB: Task;

beforeEach(async () => {
  const a = await registeredClient({ name: 'User A' });
  const b = await registeredClient({ name: 'User B' });
  userA = a.client;
  userAId = a.user.id;
  userBId = b.user.id;
  taskB = await createTaskFor(userBId, { title: "B's task", description: 'private' });
  trashedTaskB = await createTaskFor(userBId, { title: "B's trashed task", deletedAt: new Date() });
});

const reload = (id: number) => prisma.task.findUniqueOrThrow({ where: { id } });

describe("cross-user access to another user's tasks", () => {
  it('User A cannot view User B’s task', async () => {
    const res = await userA.get(`/api/tasks/${taskB.id}`).expect(404);
    expect(res.body).toEqual({ success: false, message: 'Task not found.' });
  });

  it('User A cannot update User B’s task (PATCH or PUT)', async () => {
    await userA.patch(`/api/tasks/${taskB.id}`, { title: 'Hacked' }).expect(404);
    await userA.put(`/api/tasks/${taskB.id}`, { title: 'Hacked' }).expect(404);
    expect((await reload(taskB.id)).title).toBe("B's task");
  });

  it('User A cannot toggle User B’s task', async () => {
    await userA.patch(`/api/tasks/${taskB.id}/toggle-completion`).expect(404);
    expect((await reload(taskB.id)).isCompleted).toBe(false);
    expect(await prisma.taskActivity.count()).toBe(0);
  });

  it('User A cannot delete User B’s task', async () => {
    await userA.delete(`/api/tasks/${taskB.id}`).expect(404);
    expect((await reload(taskB.id)).deletedAt).toBeNull();
  });

  it('User A cannot restore User B’s trashed task', async () => {
    await userA.post(`/api/tasks/${trashedTaskB.id}/restore`).expect(404);
    expect((await reload(trashedTaskB.id)).deletedAt).not.toBeNull();
  });

  it('User A cannot permanently delete User B’s trashed task', async () => {
    await userA.delete(`/api/tasks/${trashedTaskB.id}/force-delete`).expect(404);
    expect(await prisma.task.findUnique({ where: { id: trashedTaskB.id } })).not.toBeNull();
  });

  it("User B's tasks never appear in User A's listing, trash, search or statistics", async () => {
    const list = await userA.get('/api/tasks?search=task').expect(200);
    const trash = await userA.get('/api/tasks/trash').expect(200);
    const stats = await userA.get('/api/tasks/statistics').expect(200);

    expect(list.body.data).toEqual([]);
    expect(trash.body.data).toEqual([]);
    expect(stats.body.data).toEqual({ total: 0, completed: 0, pending: 0, trashed: 0 });
  });

  it("User B's activity never appears in User A's recent activity", async () => {
    const b = await registeredClient({ name: 'User B2' });
    const task = await createTaskFor(b.user.id);
    await b.client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);

    const res = await userA.get('/api/activities/recent').expect(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('ownership cannot be manipulated through request data', () => {
  it('ignores userId in the create payload', async () => {
    const res = await userA.post('/api/tasks', { title: 'Mine', userId: userBId }).expect(201);
    expect(res.body.data.userId).toBe(userAId);
    expect(await prisma.task.count({ where: { userId: userBId } })).toBe(2);
  });

  it('ignores userId in the update payload', async () => {
    const own = await createTaskFor(userAId);
    const res = await userA.patch(`/api/tasks/${own.id}`, { title: 'Still mine', userId: userBId }).expect(200);
    expect(res.body.data.userId).toBe(userAId);
    expect((await reload(own.id)).userId).toBe(userAId);
  });

  it('rejects an update payload that only tries to change ownership', async () => {
    const own = await createTaskFor(userAId);
    await userA.patch(`/api/tasks/${own.id}`, { userId: userBId }).expect(422);
    expect((await reload(own.id)).userId).toBe(userAId);
  });

  it('ignores userId supplied as a query parameter', async () => {
    const res = await userA.get(`/api/tasks?userId=${userBId}`).expect(200);
    expect(res.body.data).toEqual([]);

    const stats = await userA.get(`/api/tasks/statistics?userId=${userBId}`).expect(200);
    expect(stats.body.data.total).toBe(0);
  });
});
