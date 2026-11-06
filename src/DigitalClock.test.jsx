import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { clock } from './model';
import DigitalClock from './DigitalClock';

describe('large digital clock', () => {
  it('renders hours, colon and minutes as separate, ordered groups', () => {
    const markup = renderToStaticMarkup(<DigitalClock city="Helsinki" time={{ digits: '14:38', period: '' }} fontSize={123} />);
    expect(markup).toContain('font-size:123px');
    expect(markup).toContain('<span class="time-hours">14</span><span class="time-colon">:</span><span class="time-minutes">38</span>');
    expect(markup).toContain('aria-label="Helsinki 14:38"');
    expect(markup).not.toContain('time-period');
  });
  it.each([
    ['2026-11-06T00:00:00Z', '12:00', 'AM'],
    ['2026-11-06T12:00:00Z', '12:00', 'PM'],
    ['2026-11-06T20:08:00Z', '08:08', 'PM'],
  ])('keeps a readable complete label and separate period for %s', (date, digits, period) => {
    const time = clock(new Date(date), '12');
    const markup = renderToStaticMarkup(<DigitalClock city="赫尔辛基" time={time} fontSize={123} />);
    expect(markup).toContain(`aria-label="赫尔辛基 ${digits} ${period}"`);
    expect(markup).toContain(`<small class="time-period" aria-hidden="true">${period}</small>`);
  });
  it('keeps zero-padded digits in 24-hour mode', () => {
    const time = clock(new Date('2026-11-06T03:04:00Z'), '24');
    const markup = renderToStaticMarkup(<DigitalClock city="西安" time={time} fontSize={123} />);
    expect(markup).toContain('class="time-hours">03');
    expect(markup).toContain('class="time-minutes">04');
    expect(markup).toContain('role="img"');
  });
});
