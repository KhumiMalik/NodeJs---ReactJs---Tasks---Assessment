export interface Task {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type TaskStatus = 'all' | 'pending' | 'completed';

export interface TaskListParams {
  search?: string;
  status: TaskStatus;
  page: number;
  perPage: number;
}

export interface TaskInput {
  title: string;
  description: string | null;
  isCompleted?: boolean;
}

export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  trashed: number;
}

export interface Activity {
  id: number;
  taskId: number | null;
  taskTitle: string;
  action: 'TASK_COMPLETED';
  createdAt: string;
}
