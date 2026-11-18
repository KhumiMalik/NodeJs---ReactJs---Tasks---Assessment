/** Mirrors the backend's CurrentWeather response (GET /api/weather). */
export interface CurrentWeather {
  city: string;
  region: string | null;
  country: string | null;
  /** °C */
  temperature: number;
  /** °C */
  feelsLike: number;
  /** % */
  humidity: number;
  condition: string;
  weatherCode: number;
  /** km/h */
  windSpeed: number;
  /** mm */
  precipitation: number;
  isDay: boolean;
  /** Local time at the location, ISO 8601 without offset. */
  observedAt: string;
  timezone: string | null;
}
