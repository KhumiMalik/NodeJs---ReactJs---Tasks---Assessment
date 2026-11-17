import { prisma } from '../../config/database.js';
import type { RecordActivityInput } from './activity.types.js';

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  await prisma.taskActivity.create({ data: input });
}

export function listRecentActivities(userId: number, limit: number) {
  return prisma.taskActivity.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: { id: true, taskId: true, taskTitle: true, action: true, createdAt: true },
  });
}
