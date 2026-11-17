import type { Request, Response } from 'express';
import { currentUserId } from '../../middleware/authenticate.js';
import { getInput } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/api-response.js';
import * as taskService from './task.service.js';
import type {
  createTaskSchema,
  listTasksSchema,
  listTrashSchema,
  replaceTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from './task.validation.js';

export async function list(req: Request, res: Response) {
  const { query } = getInput<typeof listTasksSchema>(req);
  const { tasks, meta } = await taskService.listTasks(currentUserId(req), query);
  sendSuccess(res, { message: 'Tasks retrieved successfully.', data: tasks, meta });
}

export async function trash(req: Request, res: Response) {
  const { query } = getInput<typeof listTrashSchema>(req);
  const { tasks, meta } = await taskService.listTrashedTasks(currentUserId(req), query);
  sendSuccess(res, { message: 'Trashed tasks retrieved successfully.', data: tasks, meta });
}

export async function statistics(req: Request, res: Response) {
  const stats = await taskService.getTaskStatistics(currentUserId(req));
  sendSuccess(res, { message: 'Task statistics retrieved successfully.', data: stats });
}

export async function show(req: Request, res: Response) {
  const { params } = getInput<typeof taskIdSchema>(req);
  const task = await taskService.getTask(currentUserId(req), params.id);
  sendSuccess(res, { message: 'Task retrieved successfully.', data: task });
}

export async function create(req: Request, res: Response) {
  const { body } = getInput<typeof createTaskSchema>(req);
  const task = await taskService.createTask(currentUserId(req), body);
  sendSuccess(res, { status: 201, message: 'Task created successfully.', data: task });
}

export async function replace(req: Request, res: Response) {
  const { params, body } = getInput<typeof replaceTaskSchema>(req);
  const task = await taskService.updateTask(currentUserId(req), params.id, body);
  sendSuccess(res, { message: 'Task updated successfully.', data: task });
}

export async function update(req: Request, res: Response) {
  const { params, body } = getInput<typeof updateTaskSchema>(req);
  const task = await taskService.updateTask(currentUserId(req), params.id, body);
  sendSuccess(res, { message: 'Task updated successfully.', data: task });
}

export async function toggleCompletion(req: Request, res: Response) {
  const { params } = getInput<typeof taskIdSchema>(req);
  const task = await taskService.toggleTaskCompletion(currentUserId(req), params.id);
  const message = task.isCompleted ? 'Task marked as completed.' : 'Task marked as pending.';
  sendSuccess(res, { message, data: task });
}

export async function destroy(req: Request, res: Response) {
  const { params } = getInput<typeof taskIdSchema>(req);
  await taskService.softDeleteTask(currentUserId(req), params.id);
  res.status(204).end();
}

export async function restore(req: Request, res: Response) {
  const { params } = getInput<typeof taskIdSchema>(req);
  const task = await taskService.restoreTask(currentUserId(req), params.id);
  sendSuccess(res, { message: 'Task restored successfully.', data: task });
}

export async function forceDelete(req: Request, res: Response) {
  const { params } = getInput<typeof taskIdSchema>(req);
  await taskService.forceDeleteTask(currentUserId(req), params.id);
  res.status(204).end();
}
