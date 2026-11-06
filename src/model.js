export const CITIES = [
  { id: 'helsinki', zh: '赫尔辛基', en: 'Helsinki', lat: 60.1699, lon: 24.9384, zone: 'Europe/Helsinki', offset: 2, dst: true },
  { id: 'xian', zh: '西安', en: 'Xi’an', lat: 34.3416, lon: 108.9398, zone: 'Asia/Shanghai', offset: 8 },
  { id: 'london', zh: '伦敦', en: 'London', lat: 51.5074, lon: -0.1278, zone: 'Europe/London', offset: 0, dst: true },
  { id: 'lofoten', zh: '罗弗敦群岛', en: 'Lofoten', lat: 68.2343, lon: 14.5682, zone: 'Europe/Oslo', offset: 1, dst: true },
  { id: 'osaka', zh: '大阪', en: 'Osaka', lat: 34.6937, lon: 135.5023, zone: 'Asia/Tokyo', offset: 9 },
];

export const DEFAULT_SETTINGS = { primary: 'helsinki', secondary: 'xian', language: 'zh', format: '24', rotation: 'auto' };
export const cityById = (id) => CITIES.find((city) => city.id === id) || CITIES[0];
export const cityName = (city, language) => city[language === 'zh' ? 'zh' : 'en'];
export const pad = (n) => String(n).padStart(2, '0');

// The preset cities use fixed offsets or the EU's common DST rule. Avoid Intl
// and Date parsing of timezone-less API strings on old Kindle browsers.
export function cityDate(city, now = new Date()) {
  const year = now.getUTCFullYear();
  const lastSunday = (month) => {
    const end = new Date(Date.UTC(year, month + 1, 0));
    return Date.UTC(year, month, end.getUTCDate() - end.getUTCDay(), 1);
  };
  const summer = city.dst && now.getTime() >= lastSunday(2) && now.getTime() < lastSunday(9);
  return new Date(now.getTime() + (city.offset + (summer ? 1 : 0)) * 3600000);
}

export function dateKey(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function clock(date, format) {
  const hour = date.getUTCHours();
  return {
    digits: `${pad(format === '12' ? hour % 12 || 12 : hour)}:${pad(date.getUTCMinutes())}`,
    period: format === '12' ? (hour < 12 ? 'AM' : 'PM') : '',
  };
}

export function fullDate(date, language) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  if (language === 'zh') return `${y}年${m + 1}月${d}日 · 星期${'日一二三四五六'[date.getUTCDay()]}`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getUTCDay()]}, ${d} ${months[m]} ${y}`;
}

// Three schedule slots per Helsinki calendar day. Before 06:00, the active
// slot is yesterday at 18:00, not an extra fourth midnight refresh.
export function refreshSlot(now = new Date()) {
  const date = cityDate(CITIES[0], now);
  const hour = date.getUTCHours();
  if (hour < 6) {
    date.setUTCDate(date.getUTCDate() - 1);
    return `${dateKey(date)}-18`;
  }
  return `${dateKey(date)}-${hour < 12 ? '06' : hour < 18 ? '12' : '18'}`;
}

export function normalizeSettings(value) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object') return settings;
  for (const key of ['primary', 'secondary']) {
    // Keep existing city order and preferences when replacing the old preset.
    const id = value[key] === 'beijing' ? 'xian' : value[key];
    if (CITIES.some((city) => city.id === id)) settings[key] = id;
  }
  if (settings.primary === settings.secondary) settings.secondary = CITIES.find((city) => city.id !== settings.primary).id;
  if (['zh', 'en'].includes(value.language)) settings.language = value.language;
  if (['12', '24'].includes(value.format)) settings.format = value.format;
  if (['auto', 'none', 'cw', 'ccw'].includes(value.rotation)) settings.rotation = value.rotation;
  return settings;
}

export function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private mode / full storage: keep working in memory. */ }
}

export function weatherDescription(code, language) {
  const descriptions = {
    0: ['晴', 'Clear'], 1: ['晴间多云', 'Mostly clear'], 2: ['局部多云', 'Partly cloudy'], 3: ['阴', 'Overcast'],
    45: ['雾', 'Fog'], 48: ['冻雾', 'Rime fog'], 51: ['小毛毛雨', 'Light drizzle'], 53: ['毛毛雨', 'Drizzle'], 55: ['强毛毛雨', 'Heavy drizzle'],
    56: ['冻毛毛雨', 'Freezing drizzle'], 57: ['冻毛毛雨', 'Freezing drizzle'],
    61: ['小雨', 'Light rain'], 63: ['雨', 'Rain'], 65: ['大雨', 'Heavy rain'], 66: ['冻雨', 'Freezing rain'], 67: ['冻雨', 'Freezing rain'],
    71: ['小雪', 'Light snow'], 73: ['雪', 'Snow'], 75: ['大雪', 'Heavy snow'], 77: ['雪粒', 'Snow grains'],
    80: ['小阵雨', 'Light showers'], 81: ['阵雨', 'Showers'], 82: ['强阵雨', 'Heavy showers'],
    85: ['阵雪', 'Snow showers'], 86: ['强阵雪', 'Heavy snow showers'],
    95: ['雷暴', 'Thunderstorm'], 96: ['雷暴伴冰雹', 'Thunder & hail'], 99: ['雷暴伴冰雹', 'Thunder & hail'],
  };
  return (descriptions[code] || ['未知天气', 'Unknown'])[language === 'zh' ? 0 : 1];
}

export function weatherIconType(code) {
  if (code === 0) return 'sun';
  if (code === 1 || code === 2) return 'cloudSun';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if (code === 95) return 'thunder';
  if (code === 96 || code === 99) return 'hail';
  return 'unknown';
}

// A single timestamp must not imply that both cities have the newest data when
// only one request succeeds. Use the older of the two successful timestamps.
export function weatherUpdateSummary(entries, states, now = new Date()) {
  const available = entries.filter((entry) => entry && Number.isFinite(entry.fetchedAt));
  const updatedAt = available.length === entries.length && entries.length > 0 ? Math.min(...available.map((entry) => entry.fetchedAt)) : null;
  const errors = states.filter((state) => state === 'error').length;
  let state = 'ready';
  if (states.includes('loading')) state = 'loading';
  else if (errors) state = errors === entries.length ? 'failed' : 'partialFailed';
  else if (!available.length) state = 'empty';
  else if (available.length < entries.length) state = 'partial';
  else if (available.some((entry) => entry.slot !== refreshSlot(now))) state = 'stale';
  return { updatedAt, state };
}

export const numberText = (value) => typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : '—';

export function validWeather(data) {
  return Boolean(data && data.daily && data.hourly && Array.isArray(data.daily.time) && Array.isArray(data.hourly.time)
    && ['temperature_2m_min', 'temperature_2m_max', 'weather_code', 'sunrise', 'sunset', 'daylight_duration'].every((key) => Array.isArray(data.daily[key]))
    && ['temperature_2m', 'precipitation_probability'].every((key) => Array.isArray(data.hourly[key])));
}

export function forecastDay(data, city, now) {
  if (!validWeather(data)) return null;
  const key = dateKey(cityDate(city, now));
  const index = data.daily.time.indexOf(key);
  if (index < 0) return null;
  const points = data.hourly.time.reduce((result, time, i) => {
    if (time.slice(0, 10) === key) result.push({
      hour: Number(time.slice(11, 13)), time,
      temperature: data.hourly.temperature_2m[i],
      rain: data.hourly.precipitation_probability[i],
    });
    return result;
  }, []);
  return {
    points, min: data.daily.temperature_2m_min[index], max: data.daily.temperature_2m_max[index],
    code: data.daily.weather_code[index], sunrise: data.daily.sunrise[index], sunset: data.daily.sunset[index],
    daylight: data.daily.daylight_duration[index],
  };
}

// Keep the current hour as the baseline, then only the remaining hours of the
// city's day. Select up to five ticks from those same points so temperature,
// axis labels and rain probabilities always share one timeline.
export function forecastTimeline(points, nowHour) {
  const remaining = points.filter((point) => point.hour >= nowHour).map((point, index) => ({ ...point, index }));
  const count = Math.min(5, remaining.length);
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const index = count === 1 ? 0 : Math.round(i * (remaining.length - 1) / (count - 1));
    ticks.push(remaining[index]);
  }
  return { points: remaining, ticks };
}

export function sunTime(value, format) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return '—';
  // Open-Meteo can use 00:00 as a missing polar event sentinel.
  if (value.slice(11, 16) === '00:00') return '—';
  const hour = Number(value.slice(11, 13));
  const minute = value.slice(14, 16);
  if (format === '24') return `${pad(hour)}:${minute}`;
  return `${pad(hour % 12 || 12)}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
}
