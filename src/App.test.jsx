import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { SETTINGS_KEY } from './App';
import Settings from './Settings';
import { APP_TEXT } from './i18n';
import { normalizeSettings } from './model';
import { viewportLayout } from './layout';

function render(saved) {
  const store = { [SETTINGS_KEY]: saved === undefined ? null : JSON.stringify(saved) };
  vi.stubGlobal('localStorage', { getItem: (key) => store[key] ?? null, setItem: () => {} });
  return renderToStaticMarkup(<App />);
}

beforeEach(() => {
  vi.stubGlobal('window', { innerWidth: 1448, innerHeight: 1072, devicePixelRatio: 1 });
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-06T10:30:00Z')); // Friday 12:30 Helsinki
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('app shell', () => {
  it('renders the default two-column dashboard in Chinese', () => {
    const markup = render();
    expect(markup).toContain('赫尔辛基');
    expect(markup).toContain('西安');
    expect(markup).toContain('aria-label="赫尔辛基 12:30"');
    expect(markup).toContain('class="feeds-panel"');
    expect(markup).toContain('离下班还有');
    expect(markup).toMatch(/2026年11月6日<\/span><span class="lunar-date" lang="zh-CN"[^>]*>· 农历九月廿八<\/span><span class="date-after-lunar">· 星期五<\/span>/);
  });
  it('restores saved settings: English, 12-hour, swapped cities, fullscreen time, dark', () => {
    const markup = render({ primary: 'xian', secondary: 'helsinki', language: 'en', format: '12', showFeeds: false, theme: 'dark' });
    expect(markup).toContain('aria-label="Xi’an 06:30 PM"');
    expect(markup).not.toContain('feeds-panel');
    expect(markup).toContain('stage--fullscreen');
    expect(markup).toContain('theme--dark');
    expect(markup).toContain('Work is over');
    // The lunar date stays in Chinese and sits between weekday and date.
    expect(markup).toMatch(/>Fri<\/span><span class="lunar-date" lang="zh-CN"[^>]*>· 农历九月廿八<\/span><span class="date-after-lunar">· 6 Nov 2026<\/span>/);
  });
  it('rotates a portrait viewport into landscape by default', () => {
    vi.stubGlobal('window', { innerWidth: 1072, innerHeight: 1448, devicePixelRatio: 1 });
    expect(render()).toContain('transform:rotate(90deg)');
  });
});

describe('settings dialog', () => {
  it('shows the current choices and the measured viewport', () => {
    const settings = normalizeSettings({ language: 'en', rotation: 'ccw', showFeeds: false });
    const markup = renderToStaticMarkup(<Settings settings={settings} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.en} />);
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('<option value="ccw" selected="">');
    expect(markup).toContain('<option value="hide" selected="">');
    expect(markup).toContain('1448 × 1072 CSS px');
  });
  it('offers off / on / now for the break reminder', () => {
    const markup = renderToStaticMarkup(<Settings settings={normalizeSettings({ breakReminder: true })} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.zh} />);
    expect(markup).toContain('<option value="off">关</option><option value="on" selected="">开</option><option value="now">立即</option>');
  });
});
