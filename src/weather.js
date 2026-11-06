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

export async function fetchWeather(city) {
  // XHR supplies an actual timeout even on devices without AbortController.
  const data = await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', weatherURL(city), true);
    request.timeout = 20000;
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) return reject(new Error(`HTTP ${request.status}`));
      try { resolve(JSON.parse(request.responseText)); } catch { reject(new Error('Invalid JSON')); }
    };
    request.onerror = () => reject(new Error('Network error'));
    request.ontimeout = () => reject(new Error('Request timeout'));
    request.send();
  });
  if (!validWeather(data) || !currentWeather(data)) {
    throw new Error('Incomplete weather data');
  }
  const now = new Date();
  return { data, fetchedAt: now.getTime(), slot: refreshSlot(now) };
}
