import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/config/database.js';
import * as activityService from '../src/modules/activities/activity.service.js';
import { createTaskFor, registeredClient, type ApiClient } from './helpers.js';

let client: ApiClient;
let userId: number;

beforeEach(async () => {
  const registered = await registeredClient();
  client = registered.client;
  userId = registered.user.id;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const completionActivities = () => prisma.taskActivity.findMany({ where: { userId, action: 'TASK_COMPLETED' } });

describe('TaskCompleted event → activity history', () => {
  it('records an activity when a task goes from pending to completed', async () => {
    const task = await createTaskFor(userId, { title: 'Ship it' });
    await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);

    const activities = await completionActivities();
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ taskId: task.id, taskTitle: 'Ship it', userId });
  });

  it('does not record an activity when a completed task goes back to pending', async () => {
    const task = await createTaskFor(userId, { isCompleted: true });
    await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);
    expect(await completionActivities()).toHaveLength(0);
  });

  it('records one activity per real transition when toggled repeatedly', async () => {
    const task = await createTaskFor(userId);
    for (let i = 0; i < 4; i++) {
      await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);
    }
    // pending → completed → pending → completed → pending: two completions.
    expect(await completionActivities()).toHaveLength(2);
  });

  it('records completion made through PATCH /api/tasks/:id as well', async () => {
    const task = await createTaskFor(userId);
    await client.patch(`/api/tasks/${task.id}`, { isCompleted: true }).expect(200);
    expect(await completionActivities()).toHaveLength(1);
  });

  it('does not record anything when PATCH leaves an already-completed task completed', async () => {
    const task = await createTaskFor(userId, { isCompleted: true });
    await client.patch(`/api/tasks/${task.id}`, { isCompleted: true, title: 'Renamed' }).expect(200);
    expect(await completionActivities()).toHaveLength(0);
  });

  it('does not treat creating a task as completed as a transition', async () => {
    await client.post('/api/tasks', { title: 'Born done', isCompleted: true }).expect(201);
    expect(await completionActivities()).toHaveLength(0);
  });

  it('records exactly one activity per transition when toggles race', async () => {
    for (let round = 0; round < 5; round++) {
      const task = await createTaskFor(userId);
      const results = await Promise.all([
        client.patch(`/api/tasks/${task.id}/toggle-completion`),
        client.patch(`/api/tasks/${task.id}/toggle-completion`),
      ]);

      const statuses = results.map((r) => r.status).sort();
      const finalTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
      const activities = await prisma.taskActivity.count({ where: { taskId: task.id } });

      // Either the requests serialised (completed, then pending again) or one
      // lost the race with 409. Both toggles must never complete the task.
      if (statuses.includes(409)) {
        expect(statuses).toEqual([200, 409]);
        expect(finalTask.isCompleted).toBe(true);
      } else {
        expect(statuses).toEqual([200, 200]);
        expect(finalTask.isCompleted).toBe(false);
      }
      expect(activities).toBe(1);
    }
  });

  it('still completes the task if recording the activity fails', async () => {
    vi.spyOn(activityService, 'recordActivity').mockRejectedValueOnce(new Error('db down'));
    const task = await createTaskFor(userId);

    await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).isCompleted).toBe(true);
  });
});

describe('activity history and permanent deletion', () => {
  it('keeps history (with the title snapshot) after the task is permanently deleted', async () => {
    const task = await createTaskFor(userId, { title: 'Short-lived' });
    await client.patch(`/api/tasks/${task.id}/toggle-completion`).expect(200);
    await client.delete(`/api/tasks/${task.id}`).expect(204);
    await client.delete(`/api/tasks/${task.id}/force-delete`).expect(204);

    const activities = await completionActivities();
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({ taskId: null, taskTitle: 'Short-lived' });
  });
});

describe('GET /api/activities/recent', () => {
  it('returns the newest activities first, limited', async () => {
    const first = await createTaskFor(userId, { title: 'First' });
    const second = await createTaskFor(userId, { title: 'Second' });
    await client.patch(`/api/tasks/${first.id}/toggle-completion`).expect(200);
    await client.patch(`/api/tasks/${second.id}/toggle-completion`).expect(200);

    const res = await client.get('/api/activities/recent').expect(200);
    expect(res.body.data.map((a: { taskTitle: string }) => a.taskTitle)).toEqual(['Second', 'First']);
    expect(res.body.data[0]).toEqual({
      id: expect.any(Number),
      taskId: second.id,
      taskTitle: 'Second',
      action: 'TASK_COMPLETED',
      createdAt: expect.any(String),
    });

    const limited = await client.get('/api/activities/recent?limit=1').expect(200);
    expect(limited.body.data).toHaveLength(1);
  });

  it('validates the limit', async () => {
    await client.get('/api/activities/recent?limit=0').expect(422);
    await client.get('/api/activities/recent?limit=51').expect(422);
  });
});
