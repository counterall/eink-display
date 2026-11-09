import { describe, expect, it } from 'vitest';
import { APP_TEXT, BREAK_TEXT, pick, THEME_TEXT, TRENDING_TEXT, WORKDAY_TEXT } from './i18n';

describe('translations', () => {
  it.each([['APP_TEXT', APP_TEXT], ['TRENDING_TEXT', TRENDING_TEXT], ['WORKDAY_TEXT', WORKDAY_TEXT], ['THEME_TEXT', THEME_TEXT], ['BREAK_TEXT', BREAK_TEXT]])('%s has the same non-empty keys in zh and en', (_, table) => {
    expect(Object.keys(table.zh).sort()).toEqual(Object.keys(table.en).sort());
    for (const language of ['zh', 'en']) {
      for (const value of Object.values(table[language])) expect(typeof value === 'string' && value.length > 0).toBe(true);
    }
  });
  it('falls back to English for unknown languages', () => {
    expect(pick(WORKDAY_TEXT, 'zh')).toBe(WORKDAY_TEXT.zh);
    expect(pick(WORKDAY_TEXT, 'fi')).toBe(WORKDAY_TEXT.en);
  });
});
