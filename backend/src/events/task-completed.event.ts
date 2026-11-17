export const TASK_COMPLETED = 'task.completed';

/** Emitted after a task transitions from pending to completed (never the reverse). */
export interface TaskCompletedEvent {
  taskId: number;
  userId: number;
  title: string;
  completedAt: Date;
}
