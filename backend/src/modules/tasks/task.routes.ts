import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as taskController from './task.controller.js';
import {
  createTaskSchema,
  listTasksSchema,
  listTrashSchema,
  replaceTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from './task.validation.js';

export const taskRoutes = Router();

taskRoutes.use(authenticate);

// Static paths are registered before "/:id" so they are not captured as IDs.
taskRoutes.get('/statistics', taskController.statistics);
taskRoutes.get('/trash', validate(listTrashSchema), taskController.trash);

taskRoutes.get('/', validate(listTasksSchema), taskController.list);
taskRoutes.post('/', validate(createTaskSchema), taskController.create);

taskRoutes.get('/:id', validate(taskIdSchema), taskController.show);
taskRoutes.put('/:id', validate(replaceTaskSchema), taskController.replace);
taskRoutes.patch('/:id', validate(updateTaskSchema), taskController.update);
taskRoutes.delete('/:id', validate(taskIdSchema), taskController.destroy);

taskRoutes.patch('/:id/toggle-completion', validate(taskIdSchema), taskController.toggleCompletion);
taskRoutes.post('/:id/restore', validate(taskIdSchema), taskController.restore);
taskRoutes.delete('/:id/force-delete', validate(taskIdSchema), taskController.forceDelete);
