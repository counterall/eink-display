import { afterEach, describe, expect, it, vi } from 'vitest';
import { CITIES, DEFAULT_SETTINGS, cityById, cityDate, clock, currentWeather, dateKey, dateParts, forecastDay, normalizeSettings, numberText, readStored, refreshSlot, sunTime, validWeather, weatherDescription, writeStored } from './model';
import { fetchWeather, weatherURL } from './weather';

const helsinki = cityById('helsinki');
const xian = cityById('xian');
const fixture = () => ({
  current: { temperature_2m: 4, weather_code: 3 },
  daily: { time: ['2026-11-06', '2026-11-07'], temperature_2m_min: [2, 3], temperature_2m_max: [6, 7], weather_code: [3, 2], sunrise: ['2026-11-06T07:52', null], sunset: ['2026-11-06T16:18', null], daylight_duration: [30360, 0] },
  hourly: { time: ['2026-11-06T00:00', '2026-11-06T12:00', '2026-11-07T00:00'], temperature_2m: [2, 6, 3], precipitation_probability: [0, 20, null] },
});

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('city clocks', () => {
  it('uses Helsinki winter and summer offsets', () => {
    expect(clock(cityDate(helsinki, new Date('2026-11-06T12:38:00Z')), '24').digits).toBe('14:38');
    expect(clock(cityDate(helsinki, new Date('2026-07-06T12:38:00Z')), '24').digits).toBe('15:38');
  });
  it('changes EU daylight saving at the precise UTC boundary', () => {
    expect(clock(cityDate(helsinki, new Date('2026-03-29T00:59:00Z')), '24').digits).toBe('02:59');
    expect(clock(cityDate(helsinki, new Date('2026-03-29T01:00:00Z')), '24').digits).toBe('04:00');
    expect(clock(cityDate(helsinki, new Date('2026-10-25T00:59:00Z')), '24').digits).toBe('03:59');
    expect(clock(cityDate(helsinki, new Date('2026-10-25T01:00:00Z')), '24').digits).toBe('03:00');
  });
  it('supports all five preset timezones', () => {
    const now = new Date('2026-07-06T12:00:00Z');
    expect(CITIES.map((city) => clock(cityDate(city, now), '24').digits)).toEqual(['15:00', '20:00', '13:00', '14:00', '21:00']);
  });
  it('handles midnight, noon and second-city date rollover', () => {
    expect(clock(new Date('2026-11-06T00:00Z'), '12')).toEqual({ digits: '12:00', period: 'AM' });
    expect(clock(new Date('2026-11-06T12:00Z'), '12')).toEqual({ digits: '12:00', period: 'PM' });
    const now = new Date('2026-11-06T18:00Z');
    expect(dateKey(cityDate(helsinki, now))).toBe('2026-11-06');
    expect(dateKey(cityDate(xian, now))).toBe('2026-11-07');
  });
  it('includes year and weekday in both languages', () => {
    const now = new Date('2026-11-06T12:00Z');
    expect(dateParts(now, 'zh')).toEqual({ date: '2026年11月6日', weekday: '星期五', weekdayFirst: false });
    expect(dateParts(now, 'en')).toEqual({ date: '6 Nov 2026', weekday: 'Fri', weekdayFirst: true });
  });
});

describe('two-hour weather refresh slots', () => {
  it('moves to a new slot every two Helsinki hours', () => {
    expect(refreshSlot(new Date('2026-11-06T03:59Z'))).toBe('2026-11-06-04');
    expect(refreshSlot(new Date('2026-11-06T04:00Z'))).toBe('2026-11-06-06');
    expect(refreshSlot(new Date('2026-11-06T09:59Z'))).toBe('2026-11-06-10');
    expect(refreshSlot(new Date('2026-11-06T10:00Z'))).toBe('2026-11-06-12');
    expect(refreshSlot(new Date('2026-11-06T16:00Z'))).toBe('2026-11-06-18');
    expect(refreshSlot(new Date('2026-11-06T22:00Z'))).toBe('2026-11-07-00');
  });
  it('handles year rollover and summer time', () => {
    expect(refreshSlot(new Date('2027-01-01T00:00Z'))).toBe('2027-01-01-02');
    expect(refreshSlot(new Date('2026-07-06T03:00Z'))).toBe('2026-07-06-06');
  });
  it('has twelve regular two-hour slots in a winter calendar day', () => {
    const slots = Array.from({ length: 24 }, (_, hour) => refreshSlot(new Date(Date.UTC(2026, 10, 6, hour - 2))));
    expect(new Set(slots).size).toBe(12);
    for (let hour = 0; hour < 24; hour++) expect(slots[hour]).toBe(`2026-11-06-${String(Math.floor(hour / 2) * 2).padStart(2, '0')}`);
  });
});

describe('settings and cache resilience', () => {
  it('defaults to 100% zoom and clamps saved zoom to 70–150% in 10% steps', () => {
    expect(normalizeSettings({}).zoom).toBe(100);
    expect(normalizeSettings({ zoom: 120 }).zoom).toBe(120);
    expect(normalizeSettings({ zoom: 500 }).zoom).toBe(150);
    expect(normalizeSettings({ zoom: 10 }).zoom).toBe(70);
    expect(normalizeSettings({ zoom: 114 }).zoom).toBe(110);
    expect(normalizeSettings({ zoom: '120' }).zoom).toBe(100);
    expect(normalizeSettings({ zoom: NaN }).zoom).toBe(100);
  });
  it('defaults to light mode and keeps theme separate from the feed visibility preference', () => {
    expect(normalizeSettings({}).theme).toBe('light');
    expect(normalizeSettings({ theme: 'dark', showFeeds: false })).toMatchObject({ theme: 'dark', showFeeds: false });
    expect(normalizeSettings({ theme: 'light', showFeeds: true })).toMatchObject({ theme: 'light', showFeeds: true });
    expect(normalizeSettings({ theme: true }).theme).toBe('light');
    expect(normalizeSettings({ theme: 'system' }).theme).toBe('light');
  });
  it('keeps feeds visible for existing settings and remembers an explicit hide preference', () => {
    expect(normalizeSettings({ language: 'en' }).showFeeds).toBe(true);
    expect(normalizeSettings({ showFeeds: false }).showFeeds).toBe(false);
    expect(normalizeSettings({ showFeeds: true }).showFeeds).toBe(true);
    expect(normalizeSettings({ showFeeds: 'false' }).showFeeds).toBe(true);
  });
  it('replaces Beijing with Xi’an while preserving saved city order', () => {
    expect(CITIES.some((city) => city.id === 'beijing')).toBe(false);
    expect(xian.lat).toBe(34.3416);
    expect(xian.lon).toBe(108.9398);
    expect(normalizeSettings({ primary: 'helsinki', secondary: 'beijing' }).secondary).toBe('xian');
    expect(normalizeSettings({ primary: 'beijing', secondary: 'helsinki', language: 'en' })).toEqual({ ...DEFAULT_SETTINGS, primary: 'xian', secondary: 'helsinki', language: 'en' });
  });
  it('rejects corrupt settings and duplicate cities', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    const settings = normalizeSettings({ primary: 'osaka', secondary: 'osaka', language: 'fr', format: '99', rotation: 'bad' });
    expect(settings.primary).toBe('osaka');
    expect(settings.secondary).not.toBe('osaka');
    expect(settings.language).toBe('zh');
    expect(normalizeSettings({ language: 'en', format: '12', rotation: 'ccw' }).rotation).toBe('ccw');
  });
  it('keeps running when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('disabled'); }, setItem: () => { throw new Error('full'); } });
    expect(readStored('x')).toBeNull();
    expect(() => writeStored('x', {})).not.toThrow();
  });
});

describe('forecast presentation', () => {
  it('keeps current temperature separate from the daily range, including zero and negative values', () => {
    expect(currentWeather(fixture()).temperature_2m).toBe(4);
    expect(currentWeather({ current: { temperature_2m: 0, weather_code: 0 } }).temperature_2m).toBe(0);
    expect(currentWeather({ current: { temperature_2m: -5, weather_code: 3 } }).temperature_2m).toBe(-5);
    expect(currentWeather({ daily: fixture().daily })).toBeNull();
    expect(currentWeather({ current: { temperature_2m: null, weather_code: 3 } })).toBeNull();
  });
  it('accepts daily-only forecasts and ignores hourly data left in older caches', () => {
    const dailyOnly = { daily: fixture().daily };
    expect(validWeather(dailyOnly)).toBe(true);
    expect(validWeather(fixture())).toBe(true);
    const day = forecastDay(dailyOnly, helsinki, new Date('2026-11-06T12:00Z'));
    expect(day.min).toBe(2);
    expect(day.max).toBe(6);
    expect(day).not.toHaveProperty('points');
  });
  it('selects each city’s own calendar day', () => {
    const now = new Date('2026-11-06T18:00Z');
    expect(forecastDay(fixture(), helsinki, now).min).toBe(2);
    expect(forecastDay(fixture(), xian, now).min).toBe(3);
  });
  it('returns no forecast for old or broken data', () => {
    expect(forecastDay(fixture(), helsinki, new Date('2026-11-09T12:00Z'))).toBeNull();
    expect(forecastDay({ daily: {} }, helsinki, new Date())).toBeNull();
    expect(validWeather({})).toBe(false);
  });
  it('formats sunrise and missing polar events', () => {
    expect(sunTime('2026-11-06T07:52', '24')).toBe('07:52');
    expect(sunTime('2026-11-06T16:18', '12')).toBe('04:18 PM');
    expect(sunTime('2026-11-06T00:00', '24')).toBe('—');
    expect(sunTime(null, '24')).toBe('—');
  });
  it('localizes weather and avoids treating missing data as zero', () => {
    expect(weatherDescription(63, 'zh')).toBe('雨');
    expect(weatherDescription(63, 'en')).toBe('Rain');
    expect(weatherDescription(999, 'en')).toBe('Unknown');
    expect(numberText(null)).toBe('—');
    expect(numberText(NaN)).toBe('—');
    expect(numberText(-2.6)).toBe('-3');
  });
});

describe('weather API', () => {
  it('requests free HTTPS forecasts using the city timezone', () => {
    const url = new URL(weatherURL(xian));
    expect(url.protocol).toBe('https:');
    expect(url.searchParams.get('timezone')).toBe('Asia/Shanghai');
    expect(url.searchParams.get('forecast_days')).toBe('2');
    expect(url.searchParams.has('hourly')).toBe(false);
    expect(url.searchParams.get('current')).toBe('temperature_2m,weather_code');
    expect(url.searchParams.has('apikey')).toBe(false);
  });
  function xhr(response, status = 200, event = 'onload') {
    vi.stubGlobal('XMLHttpRequest', class {
      open() {}
      send() { this.status = status; this.responseText = JSON.stringify(response); this[event](); }
    });
  }
  it('validates and timestamps successful responses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T12:00Z'));
    xhr(fixture());
    const entry = await fetchWeather(helsinki);
    expect(entry.data).toEqual(fixture());
    expect(entry.slot).toBe('2026-11-06-14');
  });
  it('rejects HTTP errors, timeouts and malformed data', async () => {
    xhr({}, 429);
    await expect(fetchWeather(helsinki)).rejects.toThrow('HTTP 429');
    xhr({}, 200, 'ontimeout');
    await expect(fetchWeather(helsinki)).rejects.toThrow('Request timeout');
    xhr({});
    await expect(fetchWeather(helsinki)).rejects.toThrow('Incomplete weather data');
    xhr({ daily: fixture().daily });
    await expect(fetchWeather(helsinki)).rejects.toThrow('Incomplete weather data');
  });
});
