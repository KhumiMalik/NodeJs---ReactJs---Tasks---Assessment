import type { AuthUser } from '../modules/auth/auth.types.js';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware after the session is verified. */
      user?: AuthUser;
      /** Set by the `validate` middleware; read via `getInput()`. */
      validated?: unknown;
    }
  }
}

export {};
