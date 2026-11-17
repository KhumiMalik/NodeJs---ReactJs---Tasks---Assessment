import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/config/database.js';
import { sessionStore } from '../src/config/session.js';
import { assertTestDatabase } from './test-database.js';

// Importing the Prisma client does not connect; this check runs before any query.
assertTestDatabase(process.env.DATABASE_URL);

beforeEach(async () => {
  // Children before parents to satisfy foreign keys.
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.session.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  await sessionStore.close();
});
