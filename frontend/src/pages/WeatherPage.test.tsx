import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { weatherService } from '../services/weatherService';
import { apiError, renderWithProviders } from '../test/utils';
import type { CurrentWeather } from '../types/weather';
import { WeatherPage } from './WeatherPage';

vi.mock('../services/weatherService', () => ({
  weatherService: { current: vi.fn() },
}));

function makeWeather(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
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
    ...overrides,
  };
}

/** A promise the test resolves by hand, to observe the loading state. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const cityInput = () => screen.getByRole('textbox', { name: 'City' });
const searchButton = () => screen.getByRole('button', { name: /search/i });

describe('WeatherPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the heading, search form and an initial prompt', () => {
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    expect(screen.getByRole('heading', { level: 1, name: 'Weather' })).toBeInTheDocument();
    expect(cityInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('Search for a city')).toBeInTheDocument();
    expect(weatherService.current).not.toHaveBeenCalled();
  });

  it('does not search for an empty or blank city', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    await user.click(searchButton());
    expect(screen.getByText('Enter a city name to search.')).toBeInTheDocument();

    await user.type(cityInput(), '   {Enter}');
    expect(screen.getByText('Enter a city name to search.')).toBeInTheDocument();
    expect(weatherService.current).not.toHaveBeenCalled();
  });

  it('searches when Enter is pressed, shows a loading state, then the weather', async () => {
    const user = userEvent.setup();
    const request = deferred<CurrentWeather>();
    vi.mocked(weatherService.current).mockReturnValue(request.promise);
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    await user.type(cityInput(), '  Lahore {Enter}');

    expect(weatherService.current).toHaveBeenCalledWith('Lahore');
    expect(await screen.findByRole('status', { name: 'Loading weather…' })).toBeInTheDocument();
    expect(screen.getByText('Fetching the weather for Lahore…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();
    expect(screen.getByTestId('location')).toHaveTextContent('/weather?city=Lahore');

    request.resolve(makeWeather());

    const result = await screen.findByRole('article', { name: 'Current weather in Lahore' });
    expect(result).toHaveTextContent('Punjab, Pakistan');
    expect(result).toHaveTextContent('24°C');
    expect(result).toHaveTextContent('Partly cloudy');
    expect(result).toHaveTextContent('Feels like23.1 °C');
    expect(result).toHaveTextContent('Humidity41%');
    expect(result).toHaveTextContent('Wind speed9.4 km/h');
    expect(result).toHaveTextContent('Precipitation0 mm');
    expect(result).toHaveTextContent('Observed at 2:15 PM local time');
  });

  it('searches when the button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(weatherService.current).mockResolvedValue(makeWeather({ city: 'London', country: 'United Kingdom' }));
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    await user.type(cityInput(), 'London');
    await user.click(searchButton());

    expect(await screen.findByRole('article', { name: 'Current weather in London' })).toBeInTheDocument();
    expect(weatherService.current).toHaveBeenCalledWith('London');
  });

  it('ignores repeated submissions while a request is in progress', async () => {
    const user = userEvent.setup();
    const request = deferred<CurrentWeather>();
    vi.mocked(weatherService.current).mockReturnValue(request.promise);
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    await user.type(cityInput(), 'Lahore{Enter}');
    await user.type(cityInput(), '{Enter}');
    await user.click(screen.getByRole('button', { name: /searching/i }));

    expect(weatherService.current).toHaveBeenCalledTimes(1);
    request.resolve(makeWeather());
    expect(await screen.findByRole('article')).toBeInTheDocument();
  });

  it('does not show the previous city while a new search is loading', async () => {
    const user = userEvent.setup();
    const london = deferred<CurrentWeather>();
    vi.mocked(weatherService.current).mockResolvedValueOnce(makeWeather()).mockReturnValueOnce(london.promise);
    renderWithProviders(<WeatherPage />, { route: '/weather?city=Lahore' });

    expect(await screen.findByRole('article', { name: 'Current weather in Lahore' })).toBeInTheDocument();

    await user.clear(cityInput());
    await user.type(cityInput(), 'London{Enter}');

    expect(await screen.findByText('Fetching the weather for London…')).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Current weather in Lahore' })).not.toBeInTheDocument();

    london.resolve(makeWeather({ city: 'London', region: 'England', country: 'United Kingdom' }));
    expect(await screen.findByRole('article', { name: 'Current weather in London' })).toBeInTheDocument();
  });

  it('shows a helpful message when the city is not found', async () => {
    const user = userEvent.setup();
    vi.mocked(weatherService.current).mockRejectedValue(
      apiError(404, 'We couldn\'t find a city named "Atlantisville". Check the spelling and try again.'),
    );
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    await user.type(cityInput(), 'Atlantisville{Enter}');

    expect(await screen.findByText('City not found')).toBeInTheDocument();
    expect(screen.getByText(/couldn't find a city named "Atlantisville"/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows an error with a retry button when the weather service is unavailable', async () => {
    const user = userEvent.setup();
    vi.mocked(weatherService.current)
      .mockRejectedValueOnce(apiError(502, 'The weather service is currently unavailable. Please try again later.'))
      .mockResolvedValueOnce(makeWeather());
    renderWithProviders(<WeatherPage />, { route: '/weather' });

    await user.type(cityInput(), 'Lahore{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Weather is unavailable right now');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The weather service is currently unavailable. Please try again later.',
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('article', { name: 'Current weather in Lahore' })).toBeInTheDocument();
    await waitFor(() => expect(weatherService.current).toHaveBeenCalledTimes(2));
  });

  it('loads the city from the URL', async () => {
    vi.mocked(weatherService.current).mockResolvedValue(makeWeather({ isDay: false, condition: 'Clear sky' }));
    renderWithProviders(<WeatherPage />, { route: '/weather?city=Lahore' });

    expect(cityInput()).toHaveValue('Lahore');
    const result = await screen.findByRole('article', { name: 'Current weather in Lahore' });
    expect(result).toHaveTextContent('Night-time');
  });
});
