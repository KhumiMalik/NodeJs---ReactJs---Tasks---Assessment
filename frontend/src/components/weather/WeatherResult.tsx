import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Moon,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { createElement, type ReactNode } from 'react';
import type { CurrentWeather } from '../../types/weather';
import { cn } from '../../utils/cn';

/** Picks an icon for a WMO weather code; clear and partly-cloudy skies depend on day or night. */
function weatherIconFor(code: number, isDay: boolean): LucideIcon {
  if (code === 0 || code === 1) return isDay ? Sun : Moon;
  if (code === 2) return isDay ? CloudSun : CloudMoon;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

function WeatherIcon({ code, isDay, className }: { code: number; isDay: boolean; className?: string }) {
  return createElement(weatherIconFor(code, isDay), { className, 'aria-hidden': true });
}

const round = (value: number) => Math.round(value);
const oneDecimal = (value: number) => (Math.round(value * 10) / 10).toString();

/** Formats the location's own local time ("2026-11-18T14:15" → "2:15 PM"). */
function formatLocalTime(observedAt: string): string {
  const [, time = ''] = observedAt.split('T');
  const [hours, minutes] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) return observedAt;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
        {icon}
      </span>
      <div>
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="text-base font-semibold text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

export function WeatherResult({ weather, isRefreshing = false }: { weather: CurrentWeather; isRefreshing?: boolean }) {
  const place = [weather.region, weather.country].filter(Boolean).join(', ');

  return (
    <article
      aria-label={`Current weather in ${weather.city}`}
      aria-busy={isRefreshing || undefined}
      className={cn('transition-opacity', isRefreshing && 'opacity-60')}
    >
      <div
        className={cn(
          'flex flex-col gap-6 rounded-t-2xl p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8',
          weather.isDay ? 'bg-linear-to-br from-sky-500 to-indigo-600' : 'bg-linear-to-br from-slate-700 to-indigo-950',
        )}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{weather.city}</h2>
          {place && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {place}
            </p>
          )}
          <p className="mt-4 text-6xl font-bold tracking-tight" aria-label={`${oneDecimal(weather.temperature)} °C`}>
            {round(weather.temperature)}°<span className="align-top text-3xl font-semibold">C</span>
          </p>
          <p className="mt-2 text-lg font-medium">{weather.condition}</p>
        </div>
        <WeatherIcon
          code={weather.weatherCode}
          isDay={weather.isDay}
          className="h-24 w-24 shrink-0 self-center text-white/90 sm:h-32 sm:w-32"
        />
      </div>

      <dl className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
        <Metric
          icon={<Thermometer className="h-5 w-5" aria-hidden="true" />}
          label="Feels like"
          value={`${oneDecimal(weather.feelsLike)} °C`}
        />
        <Metric
          icon={<Droplets className="h-5 w-5" aria-hidden="true" />}
          label="Humidity"
          value={`${round(weather.humidity)}%`}
        />
        <Metric
          icon={<Wind className="h-5 w-5" aria-hidden="true" />}
          label="Wind speed"
          value={`${oneDecimal(weather.windSpeed)} km/h`}
        />
        <Metric
          icon={<Umbrella className="h-5 w-5" aria-hidden="true" />}
          label="Precipitation"
          value={`${oneDecimal(weather.precipitation)} mm`}
        />
      </dl>

      <p className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500 sm:px-8">
        {weather.isDay ? 'Daytime' : 'Night-time'} · Observed at {formatLocalTime(weather.observedAt)} local time
        {weather.timezone && ` (${weather.timezone})`} · Data by{' '}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Open-Meteo
        </a>
      </p>
    </article>
  );
}
