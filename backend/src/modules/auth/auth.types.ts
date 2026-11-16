import type { z } from 'zod';
import type { loginSchema, registerSchema } from './auth.validation.js';

/** Fields of a user that are safe to return to the client (never the password hash). */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

export type RegisterInput = z.output<typeof registerSchema>['body'];
export type LoginInput = z.output<typeof loginSchema>['body'];
