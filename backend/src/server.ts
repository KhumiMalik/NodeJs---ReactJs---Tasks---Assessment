import { createApp } from './app.js';
import { prisma } from './config/database.js';
import { env } from './config/env.js';
import { sessionStore } from './config/session.js';

const server = createApp().listen(env.PORT, () => {
  console.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string) {
  console.info(`${signal} received, shutting down...`);
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), sessionStore.close()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
