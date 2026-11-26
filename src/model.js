import { CAROUSEL_INTERVALS, DEFAULT_CAROUSEL_INTERVAL } from './carousel';

export const CITIES = [
  { id: 'helsinki', zh: '赫尔辛基', en: 'Helsinki', lat: 60.1699, lon: 24.9384, zone: 'Europe/Helsinki' },
  { id: 'xian', zh: '西安', en: 'Xi’an', lat: 34.3416, lon: 108.9398, zone: 'Asia/Shanghai' },
  { id: 'london', zh: '伦敦', en: 'London', lat: 51.5074, lon: -0.1278, zone: 'Europe/London' },
  { id: 'lofoten', zh: '罗弗敦群岛', en: 'Lofoten', lat: 68.2343, lon: 14.5682, zone: 'Europe/Oslo' },
  { id: 'osaka', zh: '大阪', en: 'Osaka', lat: 34.6937, lon: 135.5023, zone: 'Asia/Tokyo' },
];

export const DEFAULT_SETTINGS = { primary: 'helsinki', secondary: 'xian', language: 'zh', format: '24', showFeeds: true, theme: 'light', lightTheme: 'light', breakReminder: false, breakNotification: false, clockStyle: 'classic', carouselInterval: DEFAULT_CAROUSEL_INTERVAL };
export const CLOCK_STYLES = ['classic', 'flip'];
// Page background per theme, also used for <meta name="theme-color">. The
// inline bootstrap script in index.html repeats this table (tested to match).
export const THEME_COLORS = { light: '#ffffff', dark: '#000000', sky: '#eef4fb', sage: '#eef5ec', lavender: '#f3f0fa', mint: '#eaf5f3' };
export const THEMES = ['light', 'dark', 'sky', 'sage', 'lavender', 'mint'];
export const LIGHT_THEMES = THEMES.filter((theme) => theme !== 'dark');
// Picking a non-dark theme also remembers it, so the dark toggle can switch back to it.
export function withTheme(settings, theme) {
  const next = THEMES.includes(theme) ? theme : 'light';
  return { ...settings, theme: next, lightTheme: next === 'dark' ? settings.lightTheme : next };
}
export const toggleTheme = (settings) => withTheme(settings, settings.theme === 'dark' ? settings.lightTheme : 'dark');
export const cityById = (id) => CITIES.find((city) => city.id === id) || CITIES[0];
export const cityName = (city, language) => city[language === 'zh' ? 'zh' : 'en'];
export const pad = (n) => String(n).padStart(2, '0');

// Wall-clock time in the city's IANA zone, as a Date shifted so its getUTC* methods read that
// local time (callers use getUTCHours() etc.). Intl handles each zone's DST rules.
const zoneFormats = {};
function zoneFormat(zone) {
  if (!zoneFormats[zone]) {
    zoneFormats[zone] = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
  }
  return zoneFormats[zone];
}

export function cityDate(city, now = new Date()) {
  const parts = {};
  for (const part of zoneFormat(city.zone).formatToParts(now)) parts[part.type] = Number(part.value);
  // hourCycle h23 should never give 24, but some engines did; treat it as midnight.
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second, now.getUTCMilliseconds()));
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

// Card values for the flip look: hours, minutes and seconds as separate strings. The 12-hour
// hour has no leading zero (9, not 09); `clock()` keeps the classic padded digits.
export function flipParts(date, format) {
  const hour = date.getUTCHours();
  return {
    hours: format === '12' ? String(hour % 12 || 12) : pad(hour),
    minutes: pad(date.getUTCMinutes()),
    seconds: pad(date.getUTCSeconds()),
    period: format === '12' ? (hour < 12 ? 'AM' : 'PM') : '',
  };
}

// Date and weekday as separate parts, in reading order for the language, so
// the header can place the Chinese lunar date between them.
export function dateParts(date, language) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  if (language === 'zh') return { date: `${y}年${m + 1}月${d}日`, weekday: `星期${'日一二三四五六'[date.getUTCDay()]}`, weekdayFirst: false };
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { date: `${d} ${months[m]} ${y}`, weekday: days[date.getUTCDay()], weekdayFirst: true };
}

// Two-hour schedule slots in Helsinki time. City swapping does not change the
// schedule, and missed slots are caught up when the browser resumes.
export function refreshSlot(now = new Date()) {
  const date = cityDate(CITIES[0], now);
  const hour = date.getUTCHours();
  return `${dateKey(date)}-${pad(Math.floor(hour / 2) * 2)}`;
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
  if (typeof value.showFeeds === 'boolean') settings.showFeeds = value.showFeeds;
  if (THEMES.includes(value.theme)) settings.theme = value.theme;
  if (LIGHT_THEMES.includes(value.lightTheme)) settings.lightTheme = value.lightTheme;
  if (settings.theme !== 'dark') settings.lightTheme = settings.theme;
  if (typeof value.breakReminder === 'boolean') settings.breakReminder = value.breakReminder;
  if (typeof value.breakNotification === 'boolean') settings.breakNotification = value.breakNotification;
  if (CLOCK_STYLES.includes(value.clockStyle)) settings.clockStyle = value.clockStyle;
  if (CAROUSEL_INTERVALS.includes(value.carouselInterval)) settings.carouselInterval = value.carouselInterval;
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

export function currentWeather(data) {
  const current = data && data.current;
  return current && Number.isFinite(current.temperature_2m) && Number.isFinite(current.weather_code) ? current : null;
}

export function validWeather(data) {
  return Boolean(data && data.daily && Array.isArray(data.daily.time)
    && ['temperature_2m_min', 'temperature_2m_max', 'weather_code', 'sunrise', 'sunset', 'daylight_duration'].every((key) => Array.isArray(data.daily[key])));
}

export function forecastDay(data, city, now) {
  if (!validWeather(data)) return null;
  const key = dateKey(cityDate(city, now));
  const index = data.daily.time.indexOf(key);
  if (index < 0) return null;
  return {
    min: data.daily.temperature_2m_min[index], max: data.daily.temperature_2m_max[index],
    code: data.daily.weather_code[index], sunrise: data.daily.sunrise[index], sunset: data.daily.sunset[index],
    daylight: data.daily.daylight_duration[index],
  };
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
