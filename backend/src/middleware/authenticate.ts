import type { NextFunction, Request, Response } from 'express';
import { findUserById } from '../modules/auth/auth.service.js';
import { unauthenticated } from '../utils/app-error.js';

/**
 * Verifies the session on every protected request and loads the current user
 * from the database, so a deleted account cannot keep using an old session.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    throw unauthenticated();
  }

  const user = await findUserById(userId);
  if (!user) {
    delete req.session.userId;
    throw unauthenticated();
  }

  req.user = user;
  next();
}

/** The authenticated user's ID; only valid on routes behind `authenticate`. */
export function currentUserId(req: Request): number {
  if (!req.user) {
    throw unauthenticated();
  }
  return req.user.id;
}
