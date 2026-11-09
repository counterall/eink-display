import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { SETTINGS_KEY } from './App';
import BreakDialog from './BreakDialog';
import { BREAK_KEY } from './useBreakReminder';
import { cityById, cityDate } from './model';
import { breakSlot, elapsedPercent, normalizeBreakState, remainingMinutes } from './breaks';

const helsinki = cityById('helsinki');
const at = (iso) => cityDate(helsinki, new Date(iso));

describe('hourly break slots in the primary city time', () => {
  it.each([
    ['2026-11-06T06:59Z', null], // 08:59
    ['2026-11-06T07:00Z', null], // 09:00 work starts, no reminder yet
    ['2026-11-06T07:59Z', null],
    ['2026-11-06T08:00Z', '2026-11-06-10'],
    ['2026-11-06T08:45Z', '2026-11-06-10'], // still due later in the hour (e.g. after sleep)
    ['2026-11-06T14:59Z', '2026-11-06-16'],
    ['2026-11-06T15:00Z', null], // 17:00 work is over
  ])('%s → %s', (iso, slot) => {
    expect(breakSlot(at(iso))).toBe(slot);
  });
  it('fires seven times on a weekday and never on weekends', () => {
    const slots = new Set();
    for (let hour = 0; hour < 24; hour++) slots.add(breakSlot(at(`2026-11-06T${String(hour).padStart(2, '0')}:30Z`)));
    slots.delete(null);
    expect([...slots]).toEqual(['2026-11-06-10', '2026-11-06-11', '2026-11-06-12', '2026-11-06-13', '2026-11-06-14', '2026-11-06-15', '2026-11-06-16']);
    expect(breakSlot(at('2026-11-07T10:00Z'))).toBeNull();
    expect(breakSlot(at('2026-11-08T10:00Z'))).toBeNull();
  });
  it('uses the selected primary city rather than the device timezone', () => {
    const now = new Date('2026-11-06T02:30Z');
    expect(breakSlot(cityDate(cityById('xian'), now))).toBe('2026-11-06-10');
    expect(breakSlot(cityDate(helsinki, now))).toBeNull();
  });
});

describe('break countdown arithmetic', () => {
  it('rounds the remaining time up to whole minutes and stops at zero', () => {
    const end = 10 * 60000;
    expect(remainingMinutes(end, 0)).toBe(10);
    expect(remainingMinutes(end, 1)).toBe(10);
    expect(remainingMinutes(end, 9 * 60000 + 1)).toBe(1);
    expect(remainingMinutes(end, end)).toBe(0);
    expect(remainingMinutes(end, end + 5000)).toBe(0);
  });
  it('recovers from missing or corrupt saved state', () => {
    expect(normalizeBreakState(null)).toEqual({ handledSlot: null, endsAt: null, duration: null });
    expect(normalizeBreakState({ handledSlot: 5, endsAt: 'soon', duration: 12 })).toEqual({ handledSlot: null, endsAt: null, duration: null });
    expect(normalizeBreakState({ handledSlot: '2026-11-06-10', endsAt: 1, duration: 15 })).toEqual({ handledSlot: '2026-11-06-10', endsAt: 1, duration: 15 });
  });
  it('reports the elapsed share of the break for the progress bar', () => {
    const end = 10 * 60000;
    expect(elapsedPercent(end, 10, 0)).toBe(0);
    expect(elapsedPercent(end, 10, 2.5 * 60000)).toBe(25);
    expect(elapsedPercent(end, 10, 5 * 60000)).toBe(50);
    expect(elapsedPercent(end, 10, end)).toBe(100);
    expect(elapsedPercent(end, 10, end + 60000)).toBe(100);
    expect(elapsedPercent(end, 10, -60000)).toBe(0); // clock moved backwards
    expect(elapsedPercent(end, null, 0)).toBe(0); // older saved break without a length
  });
});

describe('break dialog', () => {
  const render = (props) => renderToStaticMarkup(<BreakDialog language="zh" minutesLeft={0} onDismiss={() => {}} onStart={() => {}} {...props} />);
  it('prompts with the coffee title, three durations and both actions', () => {
    const markup = render({ mode: 'prompt' });
    expect(markup).toContain('Take a break');
    expect(markup).toContain('lucide-coffee');
    expect(markup).toMatch(/<option value="10" selected="">10分钟<\/option><option value="15">15分钟<\/option><option value="30">30分钟<\/option>/);
    expect(markup.indexOf('下次吧')).toBeLessThan(markup.indexOf('开始吧'));
    expect(markup).toContain('class="break-close"');
  });
  it('replaces the prompt with the running countdown, keeping only the close button', () => {
    const markup = render({ mode: 'running', minutesLeft: 14 });
    expect(markup).toContain('继续休息');
    expect(markup).toContain('>14分钟</p>');
    expect(markup).not.toContain('<select');
    expect(markup).not.toContain('下次吧');
    expect(markup).toContain('class="break-close"');
    expect(markup).toContain('aria-label="关闭"');
  });
  it('shows a progress bar under the countdown filled to the elapsed share', () => {
    const markup = render({ mode: 'running', minutesLeft: 8, elapsed: 47.5 });
    expect(markup.indexOf('break-countdown')).toBeLessThan(markup.indexOf('break-progress'));
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="48"');
    expect(markup).toContain('style="width:47.5%"');
    expect(render({ mode: 'prompt' })).not.toContain('progressbar');
  });
  it('is localized in English', () => {
    expect(render({ mode: 'prompt', language: 'en' })).toContain('Maybe later');
    expect(render({ mode: 'running', language: 'en', minutesLeft: 3 })).toContain('>3 min</p>');
  });
});

describe('break reminder in the app', () => {
  function renderApp(settings, breakState) {
    const store = { [SETTINGS_KEY]: JSON.stringify(settings), [BREAK_KEY]: breakState ? JSON.stringify(breakState) : null };
    vi.stubGlobal('localStorage', { getItem: (key) => store[key] ?? null, setItem: () => {} });
    return renderToStaticMarkup(<App />);
  }
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1448, innerHeight: 1072, devicePixelRatio: 1 });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T10:30:00Z')); // Friday 12:30 Helsinki
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('stays hidden while the setting is off (the default)', () => {
    expect(renderApp({})).not.toContain('break-panel');
    expect(renderApp({ breakReminder: false }, { endsAt: Date.now() + 600000 })).not.toContain('break-panel');
  });
  it('prompts once per hour while the setting is on', () => {
    expect(renderApp({ breakReminder: true })).toContain('Take a break');
    expect(renderApp({ breakReminder: true }, { handledSlot: '2026-11-06-12' })).not.toContain('break-panel');
    expect(renderApp({ breakReminder: true }, { handledSlot: '2026-11-06-11' })).toContain('Take a break');
  });
  it('restores a running break after reload and ignores a finished one', () => {
    const running = renderApp({ breakReminder: true }, { handledSlot: '2026-11-06-12', endsAt: Date.now() + 14.5 * 60000, duration: 15 });
    expect(running).toContain('继续休息');
    expect(running).toContain('>15分钟</p>');
    expect(running).toMatch(/aria-valuenow="3".*style="width:3\.33/);
    expect(renderApp({ breakReminder: true }, { handledSlot: '2026-11-06-12', endsAt: Date.now() - 1 })).not.toContain('break-panel');
  });
  it('does not prompt outside work hours', () => {
    vi.setSystemTime(new Date('2026-11-06T15:30:00Z')); // 17:30
    expect(renderApp({ breakReminder: true })).not.toContain('break-panel');
  });
});
