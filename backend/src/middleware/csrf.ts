import { csrfSync } from 'csrf-sync';

/**
 * Synchronizer-token CSRF protection: the token lives in the server-side session
 * and the client must echo it in the X-CSRF-Token header on every state-changing
 * request (GET, HEAD and OPTIONS are exempt). The token is obtained from
 * GET /api/auth/csrf and is reset whenever the session is regenerated or destroyed.
 */
const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => req.get('x-csrf-token'),
  errorConfig: {
    statusCode: 403,
    message: 'Invalid or missing CSRF token.',
    code: 'EBADCSRFTOKEN',
  },
});

export const csrfProtection = csrfSynchronisedProtection;
export const generateCsrfToken = generateToken;
