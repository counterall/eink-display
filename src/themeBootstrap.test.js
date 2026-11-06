import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

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
  it.each([null, '{}', '{invalid', '{"theme":"system"}', '{"theme":"light"}'])('keeps the light fallback for %s', (value) => {
    expect(boot(value)).toEqual({ className: '', color: '#ffffff' });
  });
  it('does not prevent startup if browser storage is unavailable', () => {
    expect(() => boot(null, true)).not.toThrow();
  });
});
