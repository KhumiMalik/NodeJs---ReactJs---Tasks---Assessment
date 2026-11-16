import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url().startsWith('mysql://', 'DATABASE_URL must be a mysql:// connection string'),
  FRONTEND_ORIGIN: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_COOKIE_SECURE: booleanString,
  SESSION_MAX_AGE_HOURS: z.coerce.number().positive().default(24),
  TRUST_PROXY: booleanString,
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === 'production' && !env.SESSION_COOKIE_SECURE) {
  console.warn('Warning: SESSION_COOKIE_SECURE is false in production; cookies will be sent over HTTP.');
}
