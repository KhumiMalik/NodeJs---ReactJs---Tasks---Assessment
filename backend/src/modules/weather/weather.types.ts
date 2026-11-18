/** The weather shape returned to clients. Open-Meteo field names never leak through. */
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
  /** WMO weather interpretation code */
  weatherCode: number;
  /** km/h */
  windSpeed: number;
  /** mm over the preceding interval */
  precipitation: number;
  isDay: boolean;
  /** Local time of the observation at the location (ISO 8601, no offset). */
  observedAt: string;
  timezone: string | null;
}
