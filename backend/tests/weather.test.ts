import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { FORECAST_URL, GEOCODING_URL } from '../src/modules/weather/weather.service.js';
import { guestClient, registeredClient, type ApiClient } from './helpers.js';

// Open-Meteo is never called for real: global fetch is replaced in every test.
// Supertest and the MySQL driver don't use fetch, so only the outbound calls are affected.

const lahore = {
  id: 1172451,
  name: 'Lahore',
  latitude: 31.558,
  longitude: 74.35071,
  country: 'Pakistan',
  country_code: 'PK',
  admin1: 'Punjab',
  timezone: 'Asia/Karachi',
};

const forecast = {
  latitude: 31.5,
  longitude: 74.375,
  timezone: 'Asia/Karachi',
  current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
  current: {
    time: '2026-11-18T14:15',
    interval: 900,
    temperature_2m: 24.3,
    apparent_temperature: 23.1,
    relative_humidity_2m: 41,
    weather_code: 2,
    wind_speed_10m: 9.4,
    precipitation: 0,
    is_day: 1,
  },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Responder = (url: URL) => Response | Promise<Response>;

let fetchMock: MockInstance<typeof fetch>;

/** Routes mocked fetch calls to a responder for the geocoding or the forecast API. */
function mockOpenMeteo({ geocoding, weather }: { geocoding?: Responder; weather?: Responder }) {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href.startsWith(GEOCODING_URL) && geocoding) return geocoding(url);
    if (url.href.startsWith(FORECAST_URL) && weather) return weather(url);
    throw new Error(`Unexpected fetch: ${url.href}`);
  });
}

const fetchedUrls = () =>
  fetchMock.mock.calls.map(([input]) => new URL(input instanceof Request ? input.url : String(input)));

let client: ApiClient;

beforeEach(async () => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  ({ client } = await registeredClient());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/weather', () => {
  it('requires authentication', async () => {
    const guest = await guestClient();
    const res = await guest.get('/api/weather?city=Lahore').expect(401);
    expect(res.body).toEqual({ success: false, message: 'Unauthenticated.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('geocodes the city, fetches current weather and returns a clean response', async () => {
    mockOpenMeteo({
      geocoding: () => json({ results: [lahore], generationtime_ms: 0.5 }),
      weather: () => json(forecast),
    });

    const res = await client.get('/api/weather?city=%20Lahore%20').expect(200);

    expect(res.body).toEqual({
      success: true,
      message: 'Weather retrieved successfully.',
      data: {
        city: 'Lahore',
        region: 'Punjab',
        country: 'Pakistan',
        temperature: 24.3,
        feelsLike: 23.1,
        humidity: 41,
        condition: 'Partly cloudy',
        weatherCode: 2,
        windSpeed: 9.4,
        precipitation: 0,
        isDay: true,
        observedAt: '2026-11-18T14:15',
        timezone: 'Asia/Karachi',
      },
    });

    const [geocodingUrl, forecastUrl] = fetchedUrls();
    expect(geocodingUrl?.searchParams.get('name')).toBe('Lahore'); // trimmed
    expect(geocodingUrl?.searchParams.get('count')).toBe('1');
    expect(forecastUrl?.searchParams.get('latitude')).toBe('31.558');
    expect(forecastUrl?.searchParams.get('longitude')).toBe('74.35071');
    expect(forecastUrl?.searchParams.get('temperature_unit')).toBe('celsius');
    expect(forecastUrl?.searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(forecastUrl?.searchParams.get('current')?.split(',')).toEqual(
      expect.arrayContaining(['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'is_day']),
    );
  });

  it('maps night time and unknown weather codes', async () => {
    mockOpenMeteo({
      geocoding: () => json({ results: [{ ...lahore, admin1: undefined }] }),
      weather: () => json({ ...forecast, current: { ...forecast.current, is_day: 0, weather_code: 42 } }),
    });

    const res = await client.get('/api/weather?city=Lahore').expect(200);
    expect(res.body.data).toMatchObject({ isDay: false, condition: 'Unknown conditions', region: null });
  });

  it.each([
    ['missing', '/api/weather', 'The city field is required.'],
    ['empty', '/api/weather?city=', 'The city field is required.'],
    ['whitespace only', '/api/weather?city=%20%20%20', 'The city field is required.'],
    ['too short', '/api/weather?city=a', 'The city must be at least 2 characters.'],
    ['too long', `/api/weather?city=${'a'.repeat(101)}`, 'The city must not be greater than 100 characters.'],
    ['repeated parameter', '/api/weather?city=Lahore&city=Paris', 'The city must be a string.'],
  ])('rejects a %s city with 422 and does not call Open-Meteo', async (_case, url, message) => {
    const res = await client.get(url).expect(422);
    expect(res.body).toEqual({ success: false, message: 'Validation failed.', errors: { city: [message] } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 when the city cannot be found, without calling the weather API', async () => {
    // Open-Meteo omits "results" entirely when nothing matches.
    mockOpenMeteo({ geocoding: () => json({ generationtime_ms: 0.4 }) });

    const res = await client.get('/api/weather?city=Atlantisville').expect(404);
    expect(res.body).toEqual({
      success: false,
      message: 'We couldn\'t find a city named "Atlantisville". Check the spelling and try again.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 502 when the geocoding API responds with an error', async () => {
    mockOpenMeteo({ geocoding: () => json({ error: true, reason: 'Internal failure in geocoder' }, 500) });

    const res = await client.get('/api/weather?city=Lahore').expect(502);
    expect(res.body).toEqual({
      success: false,
      message: 'The location service is currently unavailable. Please try again later.',
    });
    expect(JSON.stringify(res.body)).not.toContain('Internal failure');
  });

  it('returns 502 when the geocoding API cannot be reached', async () => {
    mockOpenMeteo({
      geocoding: () => {
        throw new TypeError('fetch failed');
      },
    });

    const res = await client.get('/api/weather?city=Lahore').expect(502);
    expect(res.body.message).toBe('The location service is currently unavailable. Please try again later.');
  });

  it('returns 502 when the weather API fails', async () => {
    mockOpenMeteo({
      geocoding: () => json({ results: [lahore] }),
      weather: () => json({ error: true, reason: 'Cannot initialize WeatherVariable from invalid String value' }, 400),
    });

    const res = await client.get('/api/weather?city=Lahore').expect(502);
    expect(res.body).toEqual({
      success: false,
      message: 'The weather service is currently unavailable. Please try again later.',
    });
  });

  it('returns 504 when an external request times out', async () => {
    mockOpenMeteo({
      geocoding: () => json({ results: [lahore] }),
      weather: () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      },
    });

    const res = await client.get('/api/weather?city=Lahore').expect(504);
    expect(res.body).toEqual({
      success: false,
      message: 'The weather service took too long to respond. Please try again.',
    });
  });

  it('passes an abort signal so slow requests are cut off', async () => {
    mockOpenMeteo({ geocoding: () => json({ results: [lahore] }), weather: () => json(forecast) });
    await client.get('/api/weather?city=Lahore').expect(200);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it.each([
    ['weather response missing "current"', () => json({ results: [lahore] }), () => json({ latitude: 1 })],
    [
      'weather response with a non-numeric temperature',
      () => json({ results: [lahore] }),
      () => json({ ...forecast, current: { ...forecast.current, temperature_2m: 'hot' } }),
    ],
    [
      'weather response that is not JSON',
      () => json({ results: [lahore] }),
      () => new Response('<html>Bad gateway</html>', { status: 200 }),
    ],
  ])('returns 502 for an unexpected %s', async (_case, geocoding, weather) => {
    mockOpenMeteo({ geocoding, weather });
    const res = await client.get('/api/weather?city=Lahore').expect(502);
    expect(res.body).toEqual({
      success: false,
      message: 'The weather service is currently unavailable. Please try again later.',
    });
  });

  it('returns 502 for an unexpected geocoding response', async () => {
    mockOpenMeteo({ geocoding: () => json({ results: [{ name: 'Lahore' }] }) }); // no coordinates
    const res = await client.get('/api/weather?city=Lahore').expect(502);
    expect(res.body.message).toBe('The location service is currently unavailable. Please try again later.');
  });
});
