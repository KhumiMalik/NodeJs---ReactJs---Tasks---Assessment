import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { sendError } from '../../utils/api-response.js';
import * as authController from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';

// Slows down credential stuffing / brute force against login and registration.
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, res) => sendError(res, 429, 'Too many attempts. Please try again later.'),
});

export const authRoutes = Router();

authRoutes.get('/csrf', authController.csrfToken);
authRoutes.post('/register', authAttemptLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', authAttemptLimiter, validate(loginSchema), authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
