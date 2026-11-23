import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS } from './model';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function boot(value, blocked = false) {
  const root = { className: '' };
  const meta = { color: '#ffffff', setAttribute(name, value) { if (name === 'content') this.color = value; } };
  runInNewContext(source, {
    document: { documentElement: root, querySelector: () => meta },
    localStorage: { getItem: () => { if (blocked) throw new Error('Storage disabled'); return value; } },
  });
  return { className: root.className, color: meta.color };
}

describe('saved theme before React starts', () => {
  it('applies dark colors before the loading screen is painted', () => {
    expect(boot(JSON.stringify({ theme: 'dark' }))).toEqual({ className: ' theme--dark', color: '#000000' });
  });
  it.each([['sky', '#eef4fb'], ['sage', '#eef5ec'], ['lavender', '#f3f0fa'], ['mint', '#eaf5f3']])('applies the %s theme and its page color', (theme, color) => {
    expect(boot(JSON.stringify({ theme }))).toEqual({ className: ` theme--${theme}`, color });
  });
  it('uses the same page colors as the app for every non-light theme', () => {
    for (const theme of Object.keys(THEME_COLORS).filter((name) => name !== 'light')) {
      expect(boot(JSON.stringify({ theme }))).toEqual({ className: ` theme--${theme}`, color: THEME_COLORS[theme] });
    }
  });
  it.each([null, '{}', '{invalid', '{"theme":"system"}', '{"theme":"light"}', '{"theme":"Sky"}', '{"theme":"toString"}', '{"theme":"constructor"}', 'null', '"dark"'])('keeps the light fallback for %s', (value) => {
    expect(boot(value)).toEqual({ className: '', color: '#ffffff' });
  });
  it('does not prevent startup if browser storage is unavailable', () => {
    expect(() => boot(null, true)).not.toThrow();
  });
});
