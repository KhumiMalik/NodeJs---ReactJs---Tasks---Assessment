import { z } from 'zod';
import { requiredString } from '../../utils/validation.js';

export const CITY_MAX_LENGTH = 100;

export const currentWeatherSchema = z.object({
  query: z.object({
    city: requiredString('city')
      .trim()
      .min(1, { error: 'The city field is required.', abort: true })
      // The Open-Meteo geocoder returns no results for single-character names.
      .min(2, 'The city must be at least 2 characters.')
      .max(CITY_MAX_LENGTH, `The city must not be greater than ${CITY_MAX_LENGTH} characters.`),
  }),
});
