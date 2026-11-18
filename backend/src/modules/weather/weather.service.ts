import { z } from 'zod';
import { AppError, notFound } from '../../utils/app-error.js';
import { describeWeatherCode } from './weather-codes.js';
import type { CurrentWeather } from './weather.types.js';

export const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const REQUEST_TIMEOUT_MS = 5000;

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'precipitation',
  'is_day',
] as const;

// External responses are validated too: anything missing or malformed becomes
// a 502 instead of a crash or a half-filled response.
const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
});

const forecastResponseSchema = z.object({
  timezone: z.string().optional(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    weather_code: z.number().int(),
    wind_speed_10m: z.number(),
    precipitation: z.number(),
    is_day: z.number(),
  }),
});

type Upstream = 'location' | 'weather';

const unavailable = (service: Upstream) =>
  new AppError(502, `The ${service} service is currently unavailable. Please try again later.`);

/** Fetches JSON with a timeout and turns every transport failure into a client-safe AppError. */
async function fetchJson(url: URL, service: Upstream): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AppError(504, `The ${service} service took too long to respond. Please try again.`);
    }
    console.warn(`[weather] ${service} request failed:`, error instanceof Error ? error.message : error);
    throw unavailable(service);
  }

  if (!response.ok) {
    console.warn(`[weather] ${service} service responded with HTTP ${response.status}`);
    throw unavailable(service);
  }

  try {
    return await response.json();
  } catch {
    console.warn(`[weather] ${service} service returned invalid JSON`);
    throw unavailable(service);
  }
}

function parseUpstream<T>(schema: z.ZodType<T>, payload: unknown, service: Upstream): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    console.warn(`[weather] unexpected ${service} response:`, result.error.issues[0]?.message);
    throw unavailable(service);
  }
  return result.data;
}

async function findLocation(city: string) {
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: city, count: '1', language: 'en', format: 'json' }).toString();

  const payload = parseUpstream(geocodingResponseSchema, await fetchJson(url, 'location'), 'location');
  const location = payload.results?.[0];
  if (!location) {
    throw notFound(`We couldn't find a city named "${city}". Check the spelling and try again.`);
  }
  return location;
}

async function fetchCurrentConditions(latitude: number, longitude: number) {
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_FIELDS.join(','),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'auto',
  }).toString();

  return parseUpstream(forecastResponseSchema, await fetchJson(url, 'weather'), 'weather');
}

/** Resolves a city name to coordinates, then returns its current weather. */
export async function getCurrentWeather(city: string): Promise<CurrentWeather> {
  const location = await findLocation(city);
  const { current, timezone } = await fetchCurrentConditions(location.latitude, location.longitude);

  return {
    city: location.name,
    region: location.admin1 ?? null,
    country: location.country ?? null,
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    condition: describeWeatherCode(current.weather_code),
    weatherCode: current.weather_code,
    windSpeed: current.wind_speed_10m,
    precipitation: current.precipitation,
    isDay: current.is_day === 1,
    observedAt: current.time,
    timezone: timezone ?? location.timezone ?? null,
  };
}
