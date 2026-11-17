import { recordActivity } from '../../modules/activities/activity.service.js';
import type { TaskCompletedEvent } from '../task-completed.event.js';

export async function recordTaskCompletedActivity(event: TaskCompletedEvent): Promise<void> {
  await recordActivity({
    userId: event.userId,
    taskId: event.taskId,
    taskTitle: event.title,
    action: 'TASK_COMPLETED',
  });
}
