import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as weatherController from './weather.controller.js';
import { currentWeatherSchema } from './weather.validation.js';

export const weatherRoutes = Router();

// Signed-in users only, like the rest of the app, so the endpoint can't be
// used as an anonymous proxy to Open-Meteo.
weatherRoutes.get('/', authenticate, validate(currentWeatherSchema), weatherController.current);
