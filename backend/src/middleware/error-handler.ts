import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { sendError } from '../utils/api-response.js';
import { AppError } from '../utils/app-error.js';

interface HttpLikeError {
  status?: number;
  statusCode?: number;
  type?: string;
  expose?: boolean;
  message?: string;
}

/**
 * Central error handler. Expected errors (AppError, CSRF, malformed JSON) map to
 * their status codes; anything else is logged and returned as a generic 500 so
 * stack traces and database details never reach the client.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.errors);
    return;
  }

  const httpError = (typeof err === 'object' && err !== null ? err : {}) as HttpLikeError;

  if (httpError.type === 'entity.parse.failed') {
    sendError(res, 400, 'Malformed JSON request body.');
    return;
  }

  if (httpError.type === 'entity.too.large') {
    sendError(res, 413, 'Request body is too large.');
    return;
  }

  // http-errors instances (e.g. the CSRF error) mark client-safe 4xx errors with `expose`.
  const status = httpError.statusCode ?? httpError.status;
  if (status && status >= 400 && status < 500 && httpError.expose && httpError.message) {
    sendError(res, status, httpError.message);
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error(err);
  }
  sendError(res, 500, 'An unexpected error occurred.');
}
