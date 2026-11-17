import type { z } from 'zod';
import type { createTaskSchema, listTasksSchema, listTrashSchema, updateTaskSchema } from './task.validation.js';

export type ListTasksQuery = z.output<typeof listTasksSchema>['query'];
export type ListTrashQuery = z.output<typeof listTrashSchema>['query'];
export type CreateTaskInput = z.output<typeof createTaskSchema>['body'];
export type TaskChanges = z.output<typeof updateTaskSchema>['body'];

export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  trashed: number;
}
