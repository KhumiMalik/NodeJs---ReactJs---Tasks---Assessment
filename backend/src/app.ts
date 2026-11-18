import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { sessionMiddleware } from './config/session.js';
import { registerEventListeners } from './events/index.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { activityRoutes } from './modules/activities/activity.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';
import { weatherRoutes } from './modules/weather/weather.routes.js';
import { sendSuccess } from './utils/api-response.js';

export function createApp() {
  registerEventListeners();

  const app = express();

  if (env.TRUST_PROXY) {
    // Needed for secure cookies and correct client IPs behind a TLS-terminating proxy.
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sessionMiddleware);
  app.use(csrfProtection);

  app.get('/api/health', (_req, res) => sendSuccess(res, { message: 'OK' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/weather', weatherRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
