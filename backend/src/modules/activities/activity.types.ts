import type { ActivityAction } from '../../generated/prisma/client.js';

export interface RecordActivityInput {
  userId: number;
  taskId: number | null;
  taskTitle: string;
  action: ActivityAction;
}
