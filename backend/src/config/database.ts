import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';

/** Connection settings parsed from DATABASE_URL, shared by Prisma and the session store. */
function parseDatabaseUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
  };
}

export const databaseConfig = parseDatabaseUrl(env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  ...databaseConfig,
  connectionLimit: 10,
  // Required by the MariaDB driver to authenticate against MySQL 8's
  // caching_sha2_password over non-TLS local connections.
  allowPublicKeyRetrieval: true,
});

export const prisma = new PrismaClient({ adapter });
