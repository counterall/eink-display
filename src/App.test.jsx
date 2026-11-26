import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { SETTINGS_KEY, effectiveZoom, stageOverflows } from './App';
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
    expect(markup).toContain('class="work-start filled-button">开始工作</button>'); // no 09:00–17:00 default any more
    expect(markup).toMatch(/2026年11月6日<\/span><span class="lunar-date" lang="zh-CN"[^>]*>· 农历九月廿八<\/span><span class="date-after-lunar">· 星期五<\/span>/);
  });
  it('restores saved settings: English, 12-hour, swapped cities, fullscreen time, dark', () => {
    const markup = render({ primary: 'xian', secondary: 'helsinki', language: 'en', format: '12', showFeeds: false, theme: 'dark' });
    expect(markup).toContain('aria-label="Xi’an 06:30 PM"');
    expect(markup).not.toContain('feeds-panel');
    expect(markup).toContain('stage--fullscreen');
    expect(markup).toContain('theme--dark');
    expect(markup).toContain('>Start work</button>');
    // The lunar date stays in Chinese and sits between weekday and date.
    expect(markup).toMatch(/>Fri<\/span><span class="lunar-date" lang="zh-CN"[^>]*>· 农历九月廿八<\/span><span class="date-after-lunar">· 6 Nov 2026<\/span>/);
  });
  it('restores a colored theme on the stage and leaves light without a theme class', () => {
    expect(render({ theme: 'lavender' })).toMatch(/<main class="stage[^"]* theme--lavender"/);
    expect(render({ theme: 'mint', lightTheme: 'sky' })).toContain('theme--mint');
    expect(render({ theme: 'mint', lightTheme: 'sky' })).not.toContain('theme--sky');
    expect(render()).not.toContain('theme--');
    expect(render({ theme: 'dark', lightTheme: 'sage' })).not.toContain('theme--sage');
  });
  it('never rotates; a portrait viewport stacks Trending below the clock', () => {
    vi.stubGlobal('window', { innerWidth: 768, innerHeight: 1024, devicePixelRatio: 2 });
    const markup = render({ rotation: 'cw' });
    expect(markup).not.toContain('rotate(');
    expect(markup).toMatch(/<main class="stage stage--stacked" style="width:768px;height:1024px;font-size:14\.28\d*px"/);
    expect(markup).toContain('class="feeds-panel"');
    expect(render({ showFeeds: false })).toContain('class="stage stage--fullscreen"');
  });
  it('marks the layout mode, compact width and card themes on the stage', () => {
    expect(render()).toContain('<main class="stage stage--split"');
    expect(render({ theme: 'dark' })).toContain('<main class="stage stage--split theme--dark"');
    expect(render({ theme: 'sky' })).toContain('<main class="stage stage--split stage--card theme--sky"');
    vi.stubGlobal('window', { innerWidth: 600, innerHeight: 400, devicePixelRatio: 1 });
    expect(render({ theme: 'mint', showFeeds: false })).toContain('<main class="stage stage--fullscreen compact stage--card theme--mint"');
  });
});

describe('settings dialog', () => {
  it('shows the current choices and the measured viewport, with no rotation or Kindle reference', () => {
    const settings = normalizeSettings({ language: 'en', rotation: 'ccw', showFeeds: false });
    for (const t of [APP_TEXT.en, APP_TEXT.zh]) {
      const markup = renderToStaticMarkup(<Settings settings={settings} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1280, 800)} t={t} />);
      expect(markup).toContain('role="dialog"');
      expect(markup).toContain('<option value="hide" selected="">');
      expect(markup).toContain('1280 × 800 CSS px');
      expect(markup).not.toMatch(/Kindle|1072|ccw|value="cw"/);
    }
  });
  it('offers off / on / now for the break reminder', () => {
    const markup = renderToStaticMarkup(<Settings settings={normalizeSettings({ breakReminder: true })} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.zh} />);
    expect(markup).toContain('<option value="off">关</option><option value="on" selected="">开</option><option value="now">立即</option>');
  });
  it('offers the break notification only where the Notification API exists and the reminder is on', () => {
    const render = (settings, t = APP_TEXT.en) => renderToStaticMarkup(<Settings settings={normalizeSettings(settings)} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={t} />);
    expect(render({ breakReminder: true })).not.toContain('Break notification'); // e.g. iOS Safari outside a home-screen app: no API
    vi.stubGlobal('window', { Notification: { permission: 'granted' } });
    try {
      expect(render({ breakReminder: false })).not.toContain('Break notification');
      expect(render({ breakReminder: true })).toContain('Break notification<select><option value="off" selected="">Off</option><option value="on">On</option></select>');
      expect(render({ breakReminder: true, breakNotification: true })).toContain('<option value="on" selected="">On</option></select>');
      expect(render({ breakReminder: true, breakNotification: true }, APP_TEXT.zh)).toContain('休息通知<select>');
      window.Notification.permission = 'denied';
      const denied = render({ breakReminder: true, breakNotification: true });
      expect(denied).toContain('<option value="off" selected="">Off</option><option value="on">On</option></select>');
      expect(denied).toContain(APP_TEXT.en.notificationBlocked);
      expect(render({ breakReminder: true }, APP_TEXT.zh)).toContain(APP_TEXT.zh.notificationBlocked);
    } finally { vi.unstubAllGlobals(); }
  });
  it('offers the six themes with the current one selected', () => {
    const zh = renderToStaticMarkup(<Settings settings={normalizeSettings({ theme: 'sage' })} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.zh} />);
    expect(zh).toContain('主题<select><option value="light">浅色</option><option value="dark">深色</option><option value="sky">天蓝</option><option value="sage" selected="">鼠尾草绿</option><option value="lavender">薰衣草紫</option><option value="mint">薄荷绿</option></select>');
    const en = renderToStaticMarkup(<Settings settings={normalizeSettings({ language: 'en' })} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.en} />);
    expect(en).toContain('Theme<select><option value="light" selected="">Light</option><option value="dark">Dark</option><option value="sky">Sky</option><option value="sage">Sage</option><option value="lavender">Lavender</option><option value="mint">Mint</option></select>');
  });
});

describe('zoom auto-fit', () => {
  it('caps the saved zoom without changing it, so a layout that fits again gets it back', () => {
    expect(effectiveZoom(120, null)).toBe(120);
    expect(effectiveZoom(120, 90)).toBe(90);
    expect(effectiveZoom(80, 90)).toBe(80);
  });
});

describe('zoom overflow check', () => {
  const box = (right, bottom, width = 10) => ({ getBoundingClientRect: () => ({ right, bottom, width }) });
  function stage(className, feedNodes) {
    const card = box(100, 100);
    return {
      className,
      getBoundingClientRect: () => ({ right: 120, bottom: 120 }),
      querySelector: (selector) => (selector === '.feeds-panel' ? card : null),
      querySelectorAll: (selector) => (selector === '.dashboard *' || selector === '.feeds-panel *' ? feedNodes : []),
    };
  }
  it('only flags content past the stage in light and dark, as before', () => {
    expect(stageOverflows(stage('stage', [box(110, 110)]))).toBe(false);
    expect(stageOverflows(stage('stage theme--dark', [box(110, 110)]))).toBe(false);
    expect(stageOverflows(stage('stage', [box(130, 50)]))).toBe(true);
  });
  it('keeps Trending inside its card in the colored themes', () => {
    expect(stageOverflows(stage('stage theme--sky', [box(90, 110)]))).toBe(true);
    expect(stageOverflows(stage('stage compact theme--mint', [box(90, 100.5)]))).toBe(false);
    expect(stageOverflows(stage('stage theme--sage', [box(110, 110, 0)]))).toBe(false);
  });
});

describe('clock style', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1448, innerHeight: 1072, devicePixelRatio: 1 });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T10:30:15Z'));
  });
  it('keeps the classic look by default', () => {
    const markup = render();
    expect(markup).not.toContain('flip-');
    expect(markup).toContain('class="time-display"');
  });
  it('renders flip cards for all three clocks when chosen', () => {
    const markup = render({ clockStyle: 'flip' });
    expect(markup).not.toContain('class="time-display"');
    expect(markup).toContain('aria-label="赫尔辛基 12:30"');
    expect(markup).toContain('aria-label="西安 18:30"');
    expect(markup).toContain('flip-clock--primary');
    expect(markup).toContain('flip-clock--second');
    expect(markup.match(/flip-card--seconds/g)).toHaveLength(1);
  });
  it('offers classic / flip in Settings', () => {
    const zh = renderToStaticMarkup(<Settings settings={normalizeSettings({ clockStyle: 'flip' })} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.zh} />);
    expect(zh).toContain('时钟样式<select><option value="classic">经典</option><option value="flip" selected="">翻页</option></select>');
    const en = renderToStaticMarkup(<Settings settings={normalizeSettings({ language: 'en' })} setSettings={() => {}} close={() => {}} viewport={viewportLayout(1448, 1072)} t={APP_TEXT.en} />);
    expect(en).toContain('Clock style<select><option value="classic" selected="">Classic</option><option value="flip">Flip</option></select>');
  });
});

describe('zoom overflow check in the flip look', () => {
  const box = (right, bottom, width = 10) => ({ getBoundingClientRect: () => ({ right, bottom, width }) });
  it('flags flip cards that run past the clock column into Trending', () => {
    const stage = (flipRight) => ({
      className: 'stage',
      getBoundingClientRect: () => ({ right: 1448, bottom: 1072 }),
      querySelector: (selector) => (selector === '.clock-panel' ? box(724, 1072) : null),
      querySelectorAll: (selector) => (selector === '.flip-clock' ? [box(flipRight, 300)] : selector === '.dashboard *' ? [box(flipRight, 300)] : []),
    });
    expect(stageOverflows(stage(700))).toBe(false);
    expect(stageOverflows(stage(780))).toBe(true);
  });
});

describe('left-half layout', () => {
  it('puts the second city and the work session side by side below the main clock', () => {
    for (const clockStyle of ['classic', 'flip']) {
      const markup = render({ clockStyle });
      expect(markup).toMatch(/<div class="primary-clock"><div class="city-heading">[\s\S]*<div class="primary-time">/);
      expect(markup).toMatch(/<\/div><div class="clock-tiles"><div class="second-clock clock-tile">[\s\S]*<section class="workday-block clock-tile"/);
      // The second city's sun times sit on their own line under the name and weather row.
      expect(markup).toMatch(/second-clock clock-tile"><div class="city-heading city-heading--stacked">[\s\S]*?<\/div><\/div><div class="city-sun">/);
    }
  });
  it('shows the second city date as year / MM-DD lines when it is another day', () => {
    vi.setSystemTime(new Date('2026-11-06T18:30:00Z')); // 20:30 Helsinki, already Saturday 02:30 in Xi’an
    expect(render()).toContain('<span class="second-date"><span>2026</span><span>11-07</span></span>');
  });
  it('keeps the same tiles in fullscreen time mode', () => {
    const markup = render({ showFeeds: false, clockStyle: 'flip' });
    expect(markup).toContain('stage--fullscreen');
    expect(markup).toContain('<div class="clock-tiles">');
  });
});

describe('zoom overflow check for the tiles', () => {
  const box = (right, bottom, width = 10) => ({ getBoundingClientRect: () => ({ right, bottom, width }) });
  it('flags tile cards that run past their own tile', () => {
    const stage = (timeRight) => {
      const tile = { ...box(500, 1000), querySelectorAll: (selector) => (selector === '.clock-tile-time' ? [box(timeRight, 900)] : []) };
      return {
        className: 'stage',
        getBoundingClientRect: () => ({ right: 1448, bottom: 1072 }),
        querySelector: (selector) => (selector === '.clock-panel' ? box(724, 1072) : null),
        querySelectorAll: (selector) => (selector === '.clock-tile' ? [tile] : []),
      };
    };
    expect(stageOverflows(stage(490))).toBe(false);
    expect(stageOverflows(stage(530))).toBe(true);
  });
});
