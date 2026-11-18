import { CloudSun, MapPinOff, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Input } from '../components/common/Input';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { WeatherResult } from '../components/weather/WeatherResult';
import { useCurrentWeather } from '../hooks/useWeather';
import { getErrorMessage, getFieldErrors, isApiError } from '../services/api';

const CITY_MAX_LENGTH = 100;
const SUGGESTED_CITIES = ['Lahore', 'London', 'Tokyo'];

function validateCity(value: string): string | null {
  if (!value) return 'Enter a city name to search.';
  if (value.length < 2) return 'The city must be at least 2 characters.';
  if (value.length > CITY_MAX_LENGTH) return `The city must not be greater than ${CITY_MAX_LENGTH} characters.`;
  return null;
}

function WeatherError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (isApiError(error, 404)) {
    return (
      <EmptyState
        icon={<MapPinOff className="h-6 w-6" aria-hidden="true" />}
        title="City not found"
        description={getErrorMessage(error)}
      />
    );
  }
  if (isApiError(error, 422)) {
    const message = getFieldErrors(error)?.city?.[0] ?? getErrorMessage(error);
    return <ErrorState error={new Error(message)} title="Check the city name" />;
  }
  return <ErrorState error={error} title="Weather is unavailable right now" onRetry={onRetry} />;
}

export function WeatherPage() {
  const [params, setParams] = useSearchParams();
  // The searched city lives in the URL, like the task filters, so refresh and back/forward work.
  const city = (params.get('city') ?? '').trim();
  const weather = useCurrentWeather(city);

  const [input, setInput] = useState(city);
  const [inputError, setInputError] = useState<string | null>(null);
  const [syncedCity, setSyncedCity] = useState(city);
  if (city !== syncedCity) {
    // The URL changed elsewhere (back/forward): show that city in the box.
    setSyncedCity(city);
    setInput(city);
    setInputError(null);
  }

  function search(value: string) {
    if (weather.isFetching) return; // no duplicate submissions while a request is in flight
    const next = value.trim();
    const problem = validateCity(next);
    setInputError(problem);
    if (problem) return;

    setInput(next);
    if (next.toLowerCase() === city.toLowerCase()) {
      void weather.refetch(); // same city again: refresh it
    } else {
      setParams({ city: next });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(input);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Weather</h1>
        <p className="mt-1 text-sm text-slate-500">Check the current weather for any city.</p>
      </header>

      <form
        role="search"
        aria-label="Weather search"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-start sm:p-6"
      >
        <div className="flex-1">
          <Input
            label="City"
            name="city"
            type="text"
            placeholder="e.g. Lahore"
            autoComplete="off"
            maxLength={CITY_MAX_LENGTH}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (inputError) setInputError(null);
            }}
            error={inputError ?? undefined}
          />
        </div>
        <Button type="submit" isLoading={weather.isFetching} className="sm:mt-7">
          {!weather.isFetching && <Search className="h-4 w-4" aria-hidden="true" />}
          {weather.isFetching ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <section aria-label="Weather result" className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        {!city ? (
          <EmptyState
            icon={<CloudSun className="h-6 w-6" aria-hidden="true" />}
            title="Search for a city"
            description="Enter a city name above to see its current temperature, conditions, humidity, wind and precipitation."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_CITIES.map((suggestion) => (
                  <Button key={suggestion} variant="secondary" size="sm" onClick={() => search(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            }
          />
        ) : weather.isPending ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <LoadingSpinner size="lg" label="Loading weather…" />
            <p className="text-sm text-slate-500">Fetching the weather for {city}…</p>
          </div>
        ) : weather.isError ? (
          <WeatherError error={weather.error} onRetry={() => void weather.refetch()} />
        ) : (
          <WeatherResult weather={weather.data} isRefreshing={weather.isFetching} />
        )}
      </section>
    </div>
  );
}
