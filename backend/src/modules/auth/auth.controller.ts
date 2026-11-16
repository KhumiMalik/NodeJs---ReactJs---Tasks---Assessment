import type { Request, Response } from 'express';
import { generateCsrfToken } from '../../middleware/csrf.js';
import { getInput } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/api-response.js';
import { endSession, startAuthenticatedSession } from './auth.session.js';
import * as authService from './auth.service.js';
import type { loginSchema, registerSchema } from './auth.validation.js';

export async function register(req: Request, res: Response) {
  const { body } = getInput<typeof registerSchema>(req);
  const user = await authService.registerUser(body);
  await startAuthenticatedSession(req, user.id);
  sendSuccess(res, { status: 201, message: 'Registration successful.', data: user });
}

export async function login(req: Request, res: Response) {
  const { body } = getInput<typeof loginSchema>(req);
  const user = await authService.verifyCredentials(body);
  await startAuthenticatedSession(req, user.id);
  sendSuccess(res, { message: 'Login successful.', data: user });
}

export async function logout(req: Request, res: Response) {
  await endSession(req, res);
  sendSuccess(res, { message: 'Logged out successfully.' });
}

export function me(req: Request, res: Response) {
  sendSuccess(res, { message: 'Authenticated user retrieved successfully.', data: req.user });
}

export function csrfToken(req: Request, res: Response) {
  sendSuccess(res, { message: 'CSRF token generated.', data: { csrfToken: generateCsrfToken(req) } });
}
