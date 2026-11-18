import { useQuery } from '@tanstack/react-query';
import { weatherService } from '../services/weatherService';

export const weatherKeys = {
  current: (city: string) => ['weather', 'current', city.toLowerCase()] as const,
};

/**
 * Current weather for `city`; idle while `city` is empty.
 *
 * The cache key is the city, and there is deliberately no placeholder data, so a
 * new search shows a loading state instead of the previous city's weather.
 */
export function useCurrentWeather(city: string) {
  return useQuery({
    queryKey: weatherKeys.current(city),
    queryFn: () => weatherService.current(city),
    enabled: city.length > 0,
    // The backend already waits up to 5 s per upstream call; retrying here would
    // only delay the error message.
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
