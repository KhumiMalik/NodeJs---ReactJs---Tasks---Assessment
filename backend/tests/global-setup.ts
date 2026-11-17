import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { assertTestDatabase } from './test-database.js';

/** Applies all migrations to the test database once before the suite runs. */
export default function setup() {
  const testEnv = parse(readFileSync(new URL('../.env.test', import.meta.url)));
  assertTestDatabase(testEnv.DATABASE_URL);

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, ...testEnv },
    stdio: 'pipe',
  });
}
