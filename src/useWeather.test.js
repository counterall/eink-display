import { describe, expect, it } from 'vitest';
import { refreshSlot } from './model';
import { loadWeatherCache, shouldFetchWeather, WEATHER_RETRY_MS } from './useWeather';

const daily = { time: ['2026-11-06'], temperature_2m_min: [1], temperature_2m_max: [5], weather_code: [3], sunrise: ['2026-11-06T07:52'], sunset: ['2026-11-06T16:18'], daylight_duration: [30000] };
const data = { current: { temperature_2m: 4, weather_code: 3 }, daily };
const now = new Date('2026-11-06T10:30:00Z'); // 12:30 in Helsinki, slot 12
const entry = (overrides = {}) => ({ data, fetchedAt: now.getTime() - 60000, slot: refreshSlot(now), ...overrides });

describe('weather fetch decision', () => {
  it('fetches when nothing is cached', () => {
    expect(shouldFetchWeather({}, now)).toBe(true);
  });
  it('skips a city already fetched in the current two-hour slot', () => {
    expect(shouldFetchWeather({ cached: entry() }, now)).toBe(false);
  });
  it('fetches again once the Helsinki slot changes', () => {
    const later = new Date('2026-11-06T12:00:00Z'); // 14:00 Helsinki
    expect(refreshSlot(later)).not.toBe(refreshSlot(now));
    expect(shouldFetchWeather({ cached: entry() }, later)).toBe(true);
  });
  it('refetches an old cache entry that has no current temperature', () => {
    expect(shouldFetchWeather({ cached: entry({ data: { daily } }) }, now)).toBe(true);
  });
  it('never starts a second request while one is in flight', () => {
    expect(shouldFetchWeather({ inflight: true }, now)).toBe(false);
  });
  it('backs off for 15 minutes after a failure', () => {
    expect(shouldFetchWeather({ lastFailure: now.getTime() - WEATHER_RETRY_MS + 1000 }, now)).toBe(false);
    expect(shouldFetchWeather({ lastFailure: now.getTime() - WEATHER_RETRY_MS }, now)).toBe(true);
  });
});

describe('weather cache loading', () => {
  it('keeps valid entries for known cities only', () => {
    const stored = { helsinki: entry(), xian: entry({ fetchedAt: 'yesterday' }), beijing: entry(), london: { data: { daily: {} }, fetchedAt: 1, slot: 'x' } };
    expect(Object.keys(loadWeatherCache(stored))).toEqual(['helsinki']);
  });
  it.each([null, 'text', 42, []])('tolerates a broken cache value %s', (stored) => {
    expect(loadWeatherCache(stored)).toEqual({});
  });
});
