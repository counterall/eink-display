import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import CityHeading from './CityHeading';

const now = new Date('2026-11-06T12:00:00Z');
const t = { sunrise: '日出', sunset: '日落', current: '当前气温', forecast: '今日预报', empty: '暂无天气数据', polarDay: '极昼', polarNight: '极夜' };
const entry = { data: { current: { temperature_2m: 5, weather_code: 3 }, daily: {
  time: ['2026-11-06', '2026-11-07'], weather_code: [3, 0],
  temperature_2m_min: [2, -3], temperature_2m_max: [6, 8],
  sunrise: ['2026-11-06T07:52', '2026-11-07T06:48'], sunset: ['2026-11-06T16:18', '2026-11-07T17:07'],
  daylight_duration: [30360, 35000],
} } };
const render = (props = {}) => renderToStaticMarkup(<CityHeading city={cityById('helsinki')} entry={entry} now={now} language="zh" format="24" label="主城市" primary t={t} {...props} />);

describe('inline city heading', () => {
  it('places city name, sun events and daily weather in that order on one row', () => {
    const markup = render();
    expect(markup.indexOf('class="city-name"')).toBeLessThan(markup.indexOf('class="city-sun"'));
    expect(markup.indexOf('class="city-sun"')).toBeLessThan(markup.indexOf('class="city-weather"'));
    expect(markup).toContain('<h1 class="city-name">赫尔辛基</h1>');
    expect(markup).toContain('class="current-temperature">5<span>°C</span>');
    expect(markup).toContain('class="daily-temperature-range">2–6°C');
    expect(markup).toContain('lucide-cloud');
  });
  it('shows sun icons and times without visible sunrise/sunset labels', () => {
    const markup = render();
    expect(markup).toContain('lucide-sunrise');
    expect(markup).toContain('lucide-sunset');
    expect(markup).toContain('>07:52</span>');
    expect(markup).toContain('>16:18</span>');
    expect(markup).not.toContain('>日出<');
    expect(markup).not.toContain('>日落<');
    expect(markup).toContain('aria-label="日出 07:52"');
  });
  it('uses the same summary for the second city with a smaller heading level', () => {
    expect(render({ city: cityById('xian'), label: '第二城市', primary: false })).toContain('<h2 class="city-name">西安</h2>');
  });
  it('supports 12-hour sun times and English city/weather descriptions', () => {
    const markup = render({ language: 'en', format: '12' });
    expect(markup).toContain('>Helsinki</h1>');
    expect(markup).toContain('aria-label="日出 07:52 AM"');
    expect(markup).toContain('aria-label="日落 04:18 PM"');
    expect(markup).toContain('07:52<small class="sun-period">AM</small>');
    expect(markup).toContain('04:18<small class="sun-period">PM</small>');
    expect(markup).toContain('Overcast');
  });
  it('displays zero-degree current weather instead of treating it as missing', () => {
    const zero = { data: { ...entry.data, current: { temperature_2m: 0, weather_code: 0 } } };
    const markup = render({ entry: zero });
    expect(markup).toContain('class="current-temperature">0<span>°C</span>');
    expect(markup).toContain('lucide-sun ');
    expect(markup).toContain('class="daily-temperature-range">2–6°C');
  });
  it('keeps the range from an old daily-only cache without inventing a current temperature', () => {
    const markup = render({ entry: { data: { daily: entry.data.daily } } });
    expect(markup).toContain('class="current-temperature">—<span>°C</span>');
    expect(markup).toContain('class="daily-temperature-range">2–6°C');
  });
  it('uses each city’s own calendar day when dates differ', () => {
    const markup = render({ city: cityById('xian'), now: new Date('2026-11-06T18:00Z') });
    expect(markup).toContain('class="daily-temperature-range">-3–8°C');
    expect(markup).toContain('>06:48</span>');
  });
  it.each([[86400, '极昼', 'lucide-sun'], [0, '极夜', 'lucide-moon']])('handles polar daylight duration %s with an accessible icon', (duration, label, icon) => {
    const polar = { data: { daily: { ...entry.data.daily, daylight_duration: [duration, duration] } } };
    const markup = render({ entry: polar });
    expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain(icon);
    expect(markup).toContain('>24h</span>');
    expect(markup).not.toContain('sun-event');
  });
  it('shows neutral placeholders instead of zero when no forecast is available', () => {
    const markup = render({ entry: undefined });
    expect(markup).toContain('class="current-temperature">—<span>°C</span>');
    expect(markup).toContain('class="daily-temperature-range">—–—°C');
    expect(markup).toContain('aria-label="暂无天气数据"');
    expect(markup).not.toContain('0–0');
  });
});
