import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { weatherIconType, weatherUpdateSummary, refreshSlot } from './model';
import WeatherIcon from './WeatherIcon';

describe('unified weather update', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const older = { fetchedAt: now.getTime() - 60000, slot: refreshSlot(now) };
  const newer = { fetchedAt: now.getTime(), slot: refreshSlot(now) };
  it('uses the older of the two update times', () => {
    expect(weatherUpdateSummary([older, newer], ['ready', 'ready'], now)).toEqual({ updatedAt: older.fetchedAt, state: 'ready' });
  });
  it('does not change the timestamp when cities are swapped', () => {
    expect(weatherUpdateSummary([newer, older], ['ready', 'ready'], now).updatedAt).toBe(older.fetchedAt);
  });
  it('retains the last update while a refresh is in flight', () => {
    expect(weatherUpdateSummary([older, newer], ['loading', 'ready'], now)).toEqual({ updatedAt: older.fetchedAt, state: 'loading' });
  });
  it('reports partial failure without claiming both cities just updated', () => {
    expect(weatherUpdateSummary([older, newer], ['error', 'ready'], now)).toEqual({ updatedAt: older.fetchedAt, state: 'partialFailed' });
  });
  it('preserves the cached timestamp when both requests fail', () => {
    expect(weatherUpdateSummary([older, newer], ['error', 'error'], now)).toEqual({ updatedAt: older.fetchedAt, state: 'failed' });
  });
  it('does not invent a shared timestamp for missing data', () => {
    expect(weatherUpdateSummary([newer, undefined], ['ready', undefined], now)).toEqual({ updatedAt: null, state: 'partial' });
    expect(weatherUpdateSummary([undefined, undefined], [], now)).toEqual({ updatedAt: null, state: 'empty' });
  });
  it('flags old cached data even if one city has fresher data', () => {
    expect(weatherUpdateSummary([{ ...older, slot: '2026-11-05-18' }, newer], [], now).state).toBe('stale');
  });
});

describe('weather icons', () => {
  it.each([
    [0, 'sun'], [2, 'cloudSun'], [3, 'cloud'], [45, 'fog'], [53, 'drizzle'],
    [65, 'rain'], [75, 'snow'], [95, 'thunder'], [99, 'hail'], [999, 'unknown'],
  ])('renders weather code %s as a local SVG (%s)', (code, type) => {
    expect(weatherIconType(code)).toBe(type);
    const markup = renderToStaticMarkup(<WeatherIcon code={code} />);
    expect(markup).toContain('<svg');
    expect(markup).toContain('weather-icon');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).not.toContain('<img');
  });
  it('covers all supported Open-Meteo weather codes', () => {
    const codes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
    codes.forEach((code) => expect(weatherIconType(code)).not.toBe('unknown'));
  });
});
