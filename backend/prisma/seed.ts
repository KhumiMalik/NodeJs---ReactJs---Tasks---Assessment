/**
 * Development seed data. Creates two demo users with sample tasks.
 * DEVELOPMENT-ONLY CREDENTIALS - never use these outside local development.
 *
 *   demo@example.com / password123
 *   jane@example.com / password123
 *
 * Safe to re-run: the demo users' tasks and activities are recreated each time.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

const DEMO_PASSWORD = 'password123';

const demoTasks = [
  {
    title: 'Set up the project repository',
    description: 'Initialise Git, add README and .gitignore.',
    isCompleted: true,
  },
  { title: 'Design the database schema', description: 'Users, tasks and task activities.', isCompleted: true },
  {
    title: 'Implement session authentication',
    description: 'express-session with a MySQL store and CSRF protection.',
    isCompleted: true,
  },
  {
    title: 'Write API integration tests',
    description: 'Cover auth, ownership and validation rules.',
    isCompleted: false,
  },
  {
    title: 'Build the dashboard UI',
    description: 'Statistics, filters, task list and recent activity.',
    isCompleted: false,
  },
  { title: 'Review pull request #42', description: null, isCompleted: false },
  { title: 'Prepare demo for the interview', description: 'Walk through architecture decisions.', isCompleted: false },
  { title: 'Book dentist appointment', description: null, isCompleted: false },
  { title: 'Update dependencies', description: 'Check for security advisories.', isCompleted: true },
  { title: 'Plan sprint retrospective', description: null, isCompleted: false },
  { title: 'Read "Designing Data-Intensive Applications"', description: 'Chapters 5–7.', isCompleted: false },
  { title: 'Clean up old feature branches', description: null, isCompleted: false },
];

async function seedUser(name: string, email: string, passwordHash: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: passwordHash },
    create: { name, email, password: passwordHash },
  });
  await prisma.taskActivity.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  return user;
}

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.BCRYPT_ROUNDS);
  const demo = await seedUser('Demo User', 'demo@example.com', passwordHash);
  const jane = await seedUser('Jane Smith', 'jane@example.com', passwordHash);

  const now = Date.now();
  for (const [index, task] of demoTasks.entries()) {
    // Spread creation times so "newest first" ordering is visible.
    const createdAt = new Date(now - (demoTasks.length - index) * 3_600_000);
    const created = await prisma.task.create({ data: { ...task, userId: demo.id, createdAt } });
    if (task.isCompleted) {
      await prisma.taskActivity.create({
        data: { userId: demo.id, taskId: created.id, taskTitle: created.title, action: 'TASK_COMPLETED', createdAt },
      });
    }
  }

  await prisma.task.create({
    data: { userId: demo.id, title: 'Old idea that was discarded', deletedAt: new Date(now - 86_400_000) },
  });
  await prisma.task.create({
    data: { userId: jane.id, title: "Jane's private task", description: 'Not visible to Demo User.' },
  });

  console.info('Seeded development data. Log in with demo@example.com / password123 (development only).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
