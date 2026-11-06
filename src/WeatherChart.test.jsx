import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById, cityDate, forecastTimeline } from './model';
import WeatherChart from './WeatherChart';

const points = Array.from({ length: 24 }, (_, hour) => ({ hour, temperature: hour, rain: hour }));
const t = { unavailable: 'Forecast unavailable', forecastTemp: 'Forecast temp.', rain: 'Rain chance' };

describe('remaining hourly forecast', () => {
  it('starts at 11:00 at 11:10 and hides all earlier hours', () => {
    const now = new Date('2026-11-06T09:10:00Z');
    const hour = cityDate(cityById('helsinki'), now).getUTCHours();
    const timeline = forecastTimeline(points, hour);
    expect(timeline.points.map((point) => point.hour)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    expect(timeline.ticks.map((point) => point.hour)).toEqual([11, 14, 17, 20, 23]);
    expect(timeline.points[0].index).toBe(0);
  });
  it('advances at the next hour using the same cached data', () => {
    const before = forecastTimeline(points, 11);
    const after = forecastTimeline(points, 12);
    expect(before.points[0].hour).toBe(11);
    expect(after.points[0].hour).toBe(12);
    expect(points).toHaveLength(24);
    expect(points[0]).not.toHaveProperty('index');
  });
  it('uses each city’s own hour', () => {
    const now = new Date('2026-11-06T09:10:00Z');
    expect(forecastTimeline(points, cityDate(cityById('helsinki'), now).getUTCHours()).points[0].hour).toBe(11);
    expect(forecastTimeline(points, cityDate(cityById('xian'), now).getUTCHours()).points[0].hour).toBe(17);
  });
  it('shows a full day at midnight', () => {
    const timeline = forecastTimeline(points, 0);
    expect(timeline.points).toHaveLength(24);
    expect(timeline.ticks[0].hour).toBe(0);
    expect(timeline.ticks[timeline.ticks.length - 1].hour).toBe(23);
  });
  it.each([19, 20, 21, 22, 23])('has no repeated ticks near the end of the day at %s:00', (hour) => {
    const timeline = forecastTimeline(points, hour);
    expect(timeline.ticks).toHaveLength(24 - hour);
    expect(new Set(timeline.ticks.map((point) => point.hour)).size).toBe(timeline.ticks.length);
  });
  it('renders only the future axis and matching rain probabilities', () => {
    const markup = renderToStaticMarkup(<WeatherChart points={points} nowHour={11} t={t} />);
    expect(markup).toContain('11:00–23:00');
    expect(markup).toContain('>11</text>');
    expect(markup).toContain('>23</text>');
    expect(markup).not.toContain('>06</text>');
    expect(markup).toContain('>11%</span>');
    expect(markup).not.toContain('>6%</span>');
    expect(markup).toContain('points="40,');
  });
  it('renders the final hour as a centered point, without invalid coordinates', () => {
    const markup = renderToStaticMarkup(<WeatherChart points={points} nowHour={23} t={t} />);
    expect(markup).toContain('23:00–23:00');
    expect(markup).toContain('cx="164"');
    expect(markup).not.toContain('NaN');
    expect(markup).not.toContain('Infinity');
    expect(markup).toContain('>23%</span>');
  });
  it('does not use past temperatures to set the vertical scale', () => {
    const extremePast = points.map((point) => point.hour < 11 ? { ...point, temperature: -100 } : point);
    const markup = renderToStaticMarkup(<WeatherChart points={extremePast} nowHour={11} t={t} />);
    expect(markup).toContain('10–25°C');
    expect(markup).not.toContain('-100');
  });
  it('keeps gaps in missing future data and renders isolated valid points', () => {
    const missing = points.map((point) => ({ ...point, temperature: point.hour === 15 ? 5 : null }));
    const markup = renderToStaticMarkup(<WeatherChart points={missing} nowHour={11} t={t} />);
    expect(markup).toContain('<circle');
    expect(markup).not.toContain('<polyline');
    expect(markup).not.toContain('NaN');
  });
  it('shows an unavailable state if no remaining temperatures exist', () => {
    const markup = renderToStaticMarkup(<WeatherChart points={points.filter((point) => point.hour < 11)} nowHour={11} t={t} />);
    expect(markup).toContain('Forecast unavailable');
    expect(markup).not.toContain('<svg');
    expect(forecastTimeline([], 11)).toEqual({ points: [], ticks: [] });
  });
});
