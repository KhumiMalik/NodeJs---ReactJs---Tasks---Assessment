import { prisma } from '../../config/database.js';
import { eventBus } from '../../events/event-bus.js';
import { TASK_COMPLETED } from '../../events/task-completed.event.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { type Task } from '../../generated/prisma/client.js';
import { buildPaginationMeta } from '../../utils/api-response.js';
import { conflict, notFound } from '../../utils/app-error.js';
import type { CreateTaskInput, ListTasksQuery, ListTrashQuery, TaskChanges, TaskStatistics } from './task.types.js';

type TaskScope = 'active' | 'trashed' | 'any';

const scopeFilter: Record<TaskScope, Prisma.TaskWhereInput> = {
  active: { deletedAt: null },
  trashed: { deletedAt: { not: null } },
  any: {},
};

const newestFirst: Prisma.TaskOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/**
 * Prisma's `contains` becomes `LIKE '%term%'` on MySQL without escaping the
 * term, so "%" and "_" would act as wildcards. Escape them (and the escape
 * character itself) so the search matches the literal text the user typed.
 */
function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * The single ownership check used by every task operation. The task is looked
 * up by ID *and* owner, so another user's task is indistinguishable from a
 * missing one (404) and its existence is never revealed.
 */
async function findOwnedTask(userId: number, taskId: number, scope: TaskScope): Promise<Task> {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId, ...scopeFilter[scope] } });
  if (!task) {
    throw notFound('Task not found.');
  }
  return task;
}

export async function listTasks(userId: number, { search, status, page, perPage }: ListTasksQuery) {
  const where: Prisma.TaskWhereInput = {
    userId,
    deletedAt: null,
    // MySQL's default collation makes LIKE case-insensitive.
    ...(search && { title: { contains: escapeLikePattern(search) } }),
    ...(status !== 'all' && { isCompleted: status === 'completed' }),
  };

  // Read the page and the total in one transaction so they are consistent.
  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({ where, orderBy: newestFirst, skip: (page - 1) * perPage, take: perPage }),
    prisma.task.count({ where }),
  ]);

  return { tasks, meta: buildPaginationMeta(page, perPage, total) };
}

export async function listTrashedTasks(userId: number, { page, perPage }: ListTrashQuery) {
  const where: Prisma.TaskWhereInput = { userId, ...scopeFilter.trashed };

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      orderBy: [{ deletedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, meta: buildPaginationMeta(page, perPage, total) };
}

export function getTask(userId: number, taskId: number): Promise<Task> {
  return findOwnedTask(userId, taskId, 'active');
}

export function createTask(userId: number, input: CreateTaskInput): Promise<Task> {
  // A task created as completed never transitioned from pending, so no event is emitted.
  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      isCompleted: input.isCompleted ?? false,
    },
  });
}

export async function updateTask(userId: number, taskId: number, changes: TaskChanges): Promise<Task> {
  const existing = await findOwnedTask(userId, taskId, 'active');
  return applyChanges(existing, changes);
}

export async function toggleTaskCompletion(userId: number, taskId: number): Promise<Task> {
  const existing = await findOwnedTask(userId, taskId, 'active');
  return applyChanges(existing, { isCompleted: !existing.isCompleted });
}

/**
 * Applies changes to an owned, active task and emits TaskCompleted when the task
 * moves from pending to completed, whichever endpoint caused it.
 *
 * When completion changes, the update is conditional on the completion state we
 * read. If a concurrent request changed it first, nothing is updated and a 409
 * is returned, so a single real transition produces exactly one event.
 */
async function applyChanges(existing: Task, changes: TaskChanges): Promise<Task> {
  const completionChanges = changes.isCompleted !== undefined && changes.isCompleted !== existing.isCompleted;

  // updateMany issues a single conditional UPDATE ... WHERE, which InnoDB
  // evaluates against the latest committed row. (Prisma's update() with extra
  // filters is not guaranteed to be one atomic statement.)
  const { count } = await prisma.task.updateMany({
    where: {
      id: existing.id,
      userId: existing.userId,
      deletedAt: null,
      ...(completionChanges && { isCompleted: existing.isCompleted }),
    },
    data: {
      title: changes.title,
      description: changes.description,
      isCompleted: changes.isCompleted,
    },
  });

  if (count === 0) {
    throw conflict('The task was changed by another request. Please refresh and try again.');
  }

  const task = await prisma.task.findUniqueOrThrow({ where: { id: existing.id } });

  // Emitted after the update has committed, so listeners only ever see real state.
  if (completionChanges && task.isCompleted) {
    await eventBus.emit(TASK_COMPLETED, {
      taskId: task.id,
      userId: task.userId,
      title: task.title,
      completedAt: task.updatedAt,
    });
  }

  return task;
}

export async function softDeleteTask(userId: number, taskId: number): Promise<void> {
  const task = await findOwnedTask(userId, taskId, 'active');
  await prisma.task.update({ where: { id: task.id }, data: { deletedAt: new Date() } });
}

export async function restoreTask(userId: number, taskId: number): Promise<Task> {
  const task = await findOwnedTask(userId, taskId, 'any');
  if (task.deletedAt === null) {
    throw conflict('Only tasks in the trash can be restored.');
  }
  return prisma.task.update({ where: { id: task.id }, data: { deletedAt: null } });
}

export async function forceDeleteTask(userId: number, taskId: number): Promise<void> {
  const task = await findOwnedTask(userId, taskId, 'any');
  if (task.deletedAt === null) {
    throw conflict('Only tasks in the trash can be permanently deleted.');
  }
  // Activity rows keep their history: the foreign key sets task_id to NULL.
  await prisma.task.delete({ where: { id: task.id } });
}

export async function getTaskStatistics(userId: number): Promise<TaskStatistics> {
  const [groups, trashed] = await prisma.$transaction([
    prisma.task.groupBy({
      by: ['isCompleted'],
      where: { userId, deletedAt: null },
      _count: { _all: true },
      orderBy: { isCompleted: 'asc' },
    }),
    prisma.task.count({ where: { userId, deletedAt: { not: null } } }),
  ]);

  const countFor = (isCompleted: boolean) => {
    const group = groups.find((g) => g.isCompleted === isCompleted);
    return typeof group?._count === 'object' ? (group._count._all ?? 0) : 0;
  };
  const completed = countFor(true);
  const pending = countFor(false);

  return { total: completed + pending, completed, pending, trashed };
}
