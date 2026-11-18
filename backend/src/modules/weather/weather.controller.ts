import type { Request, Response } from 'express';
import { getInput } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/api-response.js';
import { getCurrentWeather } from './weather.service.js';
import type { currentWeatherSchema } from './weather.validation.js';

export async function current(req: Request, res: Response) {
  const { query } = getInput<typeof currentWeatherSchema>(req);
  const weather = await getCurrentWeather(query.city);
  sendSuccess(res, { message: 'Weather retrieved successfully.', data: weather });
}
