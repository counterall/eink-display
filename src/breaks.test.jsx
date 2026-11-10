import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { SETTINGS_KEY, WORK_KEY } from './App';
import BreakDialog from './BreakDialog';
import { BREAK_KEY } from './useBreakReminder';
import { breakDue, elapsedPercent, nextBreakAt, normalizeBreakState, remainingMinutes } from './breaks';

const ms = (iso) => new Date(iso).getTime();

describe('hourly loop anchored on when the window was last closed', () => {
  const startedAt = ms('2026-11-06T08:23:00Z'); // work started 10:23 Helsinki, ends 18:23
  it('is never due before work has been started', () => {
    expect(nextBreakAt(null, null)).toBeNull();
    expect(breakDue(null, null, ms('2026-11-06T10:00Z'))).toBe(false);
  });
  it('first fires one hour after work started, not on the hour', () => {
    expect(nextBreakAt(startedAt, null)).toBe(ms('2026-11-06T09:23:00Z'));
    expect(breakDue(startedAt, null, ms('2026-11-06T09:00Z'))).toBe(false); // 11:00 o'clock
    expect(breakDue(startedAt, null, ms('2026-11-06T09:22:59Z'))).toBe(false);
    expect(breakDue(startedAt, null, ms('2026-11-06T09:23:00Z'))).toBe(true);
  });
  it('restarts the hour from the moment the window is closed', () => {
    const closedAt = ms('2026-11-06T09:41:17Z');
    expect(nextBreakAt(startedAt, closedAt)).toBe(ms('2026-11-06T10:41:17Z'));
    expect(breakDue(startedAt, closedAt, ms('2026-11-06T10:41:16Z'))).toBe(false);
    expect(breakDue(startedAt, closedAt, ms('2026-11-06T10:41:17Z'))).toBe(true);
  });
  it('stays due until handled, e.g. after the Kindle wakes up', () => {
    expect(breakDue(startedAt, null, ms('2026-11-06T11:50Z'))).toBe(true);
  });
  it('ignores a window closed before today’s session began', () => {
    expect(nextBreakAt(startedAt, ms('2026-11-05T14:00Z'))).toBe(ms('2026-11-06T09:23:00Z'));
  });
  it('never fires once the eight hours are over', () => {
    expect(nextBreakAt(startedAt, ms('2026-11-06T15:30Z'))).toBeNull(); // would be 18:30 > 18:23
    expect(breakDue(startedAt, ms('2026-11-06T14:00Z'), ms('2026-11-06T16:23:00Z'))).toBe(false);
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
    expect(normalizeBreakState(null)).toEqual({ closedAt: null, endsAt: null, duration: null });
    expect(normalizeBreakState({ closedAt: 'now', endsAt: 'soon', duration: 12 })).toEqual({ closedAt: null, endsAt: null, duration: null });
    expect(normalizeBreakState({ closedAt: 5, endsAt: 1, duration: 15 })).toEqual({ closedAt: 5, endsAt: 1, duration: 15 });
    // Saved state from the old o'clock schedule is dropped harmlessly.
    expect(normalizeBreakState({ handledSlot: '2026-11-06-10' })).toEqual({ closedAt: null, endsAt: null, duration: null });
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
  it('greets a new work day with only a close button', () => {
    const markup = render({ mode: 'welcome' });
    expect(markup).toContain('新的一天开始啦 注意休息呀');
    expect(markup).toContain('class="break-close"');
    expect(markup.match(/<button/g)).toHaveLength(1);
    expect(markup).not.toContain('<select');
    expect(markup).not.toContain('progressbar');
  });
  it('is localized in English', () => {
    expect(render({ mode: 'welcome', language: 'en' })).toContain('A new day begins. Remember to take breaks!');
    expect(render({ mode: 'prompt', language: 'en' })).toContain('Maybe later');
    expect(render({ mode: 'running', language: 'en', minutesLeft: 3 })).toContain('>3 min</p>');
  });
});

describe('break reminder in the app', () => {
  const startedAt = ms('2026-11-06T08:00:00Z'); // work started 10:00 Helsinki
  function renderApp(settings, breakState, work = { startedAt }) {
    const store = { [SETTINGS_KEY]: JSON.stringify(settings), [BREAK_KEY]: breakState ? JSON.stringify(breakState) : null, [WORK_KEY]: work ? JSON.stringify(work) : null };
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
  it('prompts one hour after the window was last closed while the setting is on', () => {
    expect(renderApp({ breakReminder: true })).toContain('Take a break');
    expect(renderApp({ breakReminder: true }, { closedAt: ms('2026-11-06T09:45Z') })).not.toContain('break-panel');
    expect(renderApp({ breakReminder: true }, { closedAt: ms('2026-11-06T09:30Z') })).toContain('Take a break');
  });
  it('does not prompt before work has been started', () => {
    expect(renderApp({ breakReminder: true }, null, null)).not.toContain('break-panel');
  });
  it('restores a running break after reload and ignores a finished one', () => {
    const running = renderApp({ breakReminder: true }, { closedAt: ms('2026-11-06T09:00Z'), endsAt: Date.now() + 14.5 * 60000, duration: 15 });
    expect(running).toContain('继续休息');
    expect(running).toContain('>15分钟</p>');
    expect(running).toMatch(/aria-valuenow="3".*style="width:3\.33/);
    expect(renderApp({ breakReminder: true }, { closedAt: ms('2026-11-06T09:45Z'), endsAt: Date.now() - 1 })).not.toContain('break-panel');
  });
  it('does not prompt after the eight-hour session is over', () => {
    vi.setSystemTime(new Date('2026-11-06T16:30:00Z')); // 18:30, session ended 18:00
    expect(renderApp({ breakReminder: true })).not.toContain('break-panel');
  });
});
