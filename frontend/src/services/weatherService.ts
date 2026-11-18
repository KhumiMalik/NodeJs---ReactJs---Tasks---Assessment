import type { ApiSuccess } from '../types/api';
import type { CurrentWeather } from '../types/weather';
import { api } from './api';

export const weatherService = {
  /** Current weather for a city. The backend talks to Open-Meteo; the browser never does. */
  async current(city: string): Promise<CurrentWeather> {
    const res = await api.get<ApiSuccess<CurrentWeather>>('/weather', { params: { city } });
    return res.data.data;
  },
};
