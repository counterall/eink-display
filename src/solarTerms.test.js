import { describe, expect, it } from 'vitest';
import { currentSolarTerm, solarTermName } from './solarTerms';

describe('Chinese solar terms', () => {
  it('shows the active term between term days in both languages', () => {
    const now = new Date('2026-11-06T12:00:00Z');
    expect(solarTermName(now, 'zh')).toBe('霜降');
    expect(solarTermName(now, 'en')).toBe('Frost’s Descent');
    expect(solarTermName(new Date('2026-11-08T12:00:00Z'), 'zh')).toBe('立冬');
  });
  it('changes at the term’s actual China Standard Time instant, not local midnight', () => {
    // White Dew in 2012 began at 13:29:01 CST (05:29:01 UTC).
    expect(solarTermName(new Date('2012-09-07T05:29:00Z'), 'zh')).toBe('处暑');
    expect(solarTermName(new Date('2012-09-07T05:29:01Z'), 'zh')).toBe('白露');
    expect(solarTermName(new Date('2012-09-07T05:29:02Z'), 'en')).toBe('White Dew');
  });
  it('handles year rollover and leap years', () => {
    expect(solarTermName(new Date('2027-01-01T00:00:00Z'), 'zh')).toBe('冬至');
    expect(solarTermName(new Date('2024-02-29T12:00:00Z'), 'zh')).toBe('雨水');
    expect(solarTermName(new Date('2024-03-21T12:00:00Z'), 'en')).toBe('Spring Equinox');
  });
  it('reuses cached calculations within a term and recalculates when time moves backwards', () => {
    const first = currentSolarTerm(new Date('2026-11-06T12:00:00Z'));
    expect(currentSolarTerm(new Date('2026-11-06T12:01:00Z'))).toBe(first);
    expect(currentSolarTerm(new Date(first.start - 1000)).name).toBe('寒露');
    expect(currentSolarTerm(new Date(first.end)).name).toBe('立冬');
  });
  it('renders all 24 terms in English without Chinese fallback', () => {
    const names = [];
    let time = new Date('2026-01-01T00:00:00Z').getTime();
    for (let i = 0; i < 24; i++) {
      const term = currentSolarTerm(new Date(time));
      const name = solarTermName(new Date(time), 'en');
      expect(name).not.toMatch(/[\u4e00-\u9fff]/);
      names.push(name);
      time = term.end;
    }
    expect(new Set(names).size).toBe(24);
  });
  it('handles invalid timestamps', () => {
    expect(solarTermName(new Date(NaN), 'zh')).toBe('—');
  });
});
