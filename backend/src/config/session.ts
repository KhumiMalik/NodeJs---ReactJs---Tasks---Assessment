import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import { databaseConfig } from './database.js';
import { env } from './env.js';

const MySQLStore = MySQLStoreFactory(session);

export const SESSION_COOKIE_NAME = 'tm.sid';
const maxAgeMs = env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;

export const sessionStore = new MySQLStore({
  ...databaseConfig,
  // The sessions table is created by Prisma migrations, not by the store.
  createDatabaseTable: false,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: maxAgeMs,
});

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.SESSION_COOKIE_SECURE,
  // Lax blocks the cookie on cross-site sub-requests (POST forms, fetch) while
  // still allowing top-level navigation. The frontend and API share a site in
  // development (localhost), so Lax is sufficient.
  sameSite: 'lax',
  path: '/',
} as const;

export const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { ...sessionCookieOptions, maxAge: maxAgeMs },
});
