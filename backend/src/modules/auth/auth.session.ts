import type { Request, Response } from 'express';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../../config/session.js';

/**
 * Starts an authenticated session. The session ID is regenerated first to
 * prevent session fixation; this also discards the old CSRF token, so the
 * client must fetch a new one afterwards.
 */
export async function startAuthenticatedSession(req: Request, userId: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
  req.session.userId = userId;
  // Persist before responding so the next request sees the new session.
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

export async function endSession(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
}
