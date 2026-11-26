import { fetchJSON } from './http';
import { currentWeather, refreshSlot, validWeather } from './model';

export function weatherURL(city) {
  const params = [
    `latitude=${city.lat}`, `longitude=${city.lon}`, `timezone=${encodeURIComponent(city.zone)}`,
    'daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration',
    'current=temperature_2m,weather_code',
    'forecast_days=2',
  ];
  return `https://api.open-meteo.com/v1/forecast?${params.join('&')}`;
}

export const WEATHER_TIMEOUT_MS = 20000;

export async function fetchWeather(city) {
  const data = await fetchJSON(weatherURL(city), WEATHER_TIMEOUT_MS);
  if (!validWeather(data) || !currentWeather(data)) {
    throw new Error('Incomplete weather data');
  }
  const now = new Date();
  return { data, fetchedAt: now.getTime(), slot: refreshSlot(now) };
}
