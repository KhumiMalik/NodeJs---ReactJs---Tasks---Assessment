import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate, currentUserId } from '../../middleware/authenticate.js';
import { getInput, validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/api-response.js';
import { listRecentActivities } from './activity.service.js';

const recentActivitiesSchema = z.object({
  query: z.object({
    limit: z.coerce
      .number({ error: 'The limit must be a number.' })
      .int('The limit must be an integer.')
      .min(1, 'The limit must be at least 1.')
      .max(50, 'The limit must not be greater than 50.')
      .default(10),
  }),
});

async function recent(req: Request, res: Response) {
  const { query } = getInput<typeof recentActivitiesSchema>(req);
  const activities = await listRecentActivities(currentUserId(req), query.limit);
  sendSuccess(res, { message: 'Recent activities retrieved successfully.', data: activities });
}

export const activityRoutes = Router();

activityRoutes.get('/recent', authenticate, validate(recentActivitiesSchema), recent);
