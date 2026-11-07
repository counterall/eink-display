import { describe, expect, it } from 'vitest';
import { currentSolarTerm, lunarDateName, solarTermName } from './solarTerms';
import { cityById, cityDate } from './model';

describe('Chinese solar terms', () => {
  it('keeps the active term in Chinese even for callers requesting English', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(solarTermName(now, 'zh')).toBe('霜降');
    expect(solarTermName(now, 'en')).toBe('霜降');
    expect(solarTermName(new Date('2026-11-08T12:00:00Z'), 'zh')).toBe('立冬');
  });
  it('changes at the term’s actual China Standard Time instant, not local midnight', () => {
    // White Dew in 2012 began at 13:29:01 CST (05:29:01 UTC).
    expect(solarTermName(new Date('2012-09-07T05:29:00Z'), 'zh')).toBe('处暑');
    expect(solarTermName(new Date('2012-09-07T05:29:01Z'), 'zh')).toBe('白露');
    expect(solarTermName(new Date('2012-09-07T05:29:02Z'), 'en')).toBe('白露');
  });
  it('handles year rollover and leap years', () => {
    expect(solarTermName(new Date('2027-01-01T00:00:00Z'), 'zh')).toBe('冬至');
    expect(solarTermName(new Date('2024-02-29T12:00:00Z'), 'zh')).toBe('雨水');
    expect(solarTermName(new Date('2024-03-21T12:00:00Z'), 'en')).toBe('春分');
  });
  it('reuses cached calculations within a term and recalculates when time moves backwards', () => {
    const first = currentSolarTerm(new Date('2026-11-06T12:00:00Z'));
    expect(currentSolarTerm(new Date('2026-11-06T12:01:00Z'))).toBe(first);
    expect(currentSolarTerm(new Date(first.start - 1000)).name).toBe('寒露');
    expect(currentSolarTerm(new Date(first.end)).name).toBe('立冬');
  });
  it('renders all 24 terms in Chinese regardless of the requested language', () => {
    const names = [];
    let time = new Date('2026-01-01T00:00:00Z').getTime();
    for (let i = 0; i < 24; i++) {
      const term = currentSolarTerm(new Date(time));
      const name = solarTermName(new Date(time), 'en');
      expect(name).toMatch(/^[\u4e00-\u9fff]{2}$/);
      expect(solarTermName(new Date(time), 'zh')).toBe(name);
      names.push(name);
      time = term.end;
    }
    expect(new Set(names).size).toBe(24);
  });
  it('handles invalid timestamps', () => {
    expect(solarTermName(new Date(NaN), 'zh')).toBe('—');
  });
});

describe('Chinese lunar date', () => {
  // Takes the shifted UTC date used for a city's clock.
  const local = (ymd) => new Date(`${ymd}T12:00:00Z`);
  it.each([
    ['2026-11-06', '农历九月廿八'],
    ['2026-02-17', '农历正月初一'],
    ['2025-07-25', '农历闰六月初一'],
    ['2025-12-20', '农历冬月初一'],
    ['2026-01-01', '农历冬月十三'],
    ['2026-02-10', '农历腊月廿三'],
    ['2026-03-03', '农历正月十五'],
  ])('%s is %s', (ymd, name) => {
    expect(lunarDateName(local(ymd))).toBe(name);
  });
  it('follows the primary city\'s calendar day, not Beijing time', () => {
    const now = new Date('2026-11-06T20:00:00Z'); // 22:00 Helsinki, 04:00 next day in Xi'an
    expect(lunarDateName(cityDate(cityById('helsinki'), now))).toBe('农历九月廿八');
    expect(lunarDateName(cityDate(cityById('xian'), now))).toBe('农历九月廿九');
  });
  it('returns a placeholder for an invalid date', () => {
    expect(lunarDateName(new Date(NaN))).toBe('—');
  });
});
