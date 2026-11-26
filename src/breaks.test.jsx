import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { SETTINGS_KEY, WORK_KEY } from './App';
import BreakDialog from './BreakDialog';
import { BREAK_KEY, notifyDueBreak } from './useBreakReminder';
import { breakDue, elapsedPercent, nextBreakAt, normalizeBreakState, pendingDueAt, formatRemaining, shouldNotifyBreak } from './breaks';

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
  it('stays due until handled, e.g. after the device wakes up', () => {
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

describe('pending reminder for notifications', () => {
  const startedAt = ms('2026-11-06T08:00:00Z');
  const closedAt = ms('2026-11-06T09:00:00Z');
  const state = (extra) => ({ ...normalizeBreakState({ closedAt }), ...extra });
  it('is the due time of the scheduled reminder once it is due', () => {
    expect(pendingDueAt(startedAt, state(), ms('2026-11-06T09:59Z'))).toBeNull();
    expect(pendingDueAt(startedAt, state(), ms('2026-11-06T10:05Z'))).toBe(ms('2026-11-06T10:00Z'));
  });
  it('is never a running break or one that has just ended', () => {
    // "Now" at 09:55 started a 10-minute break; the 10:00 reminder passed meanwhile.
    expect(pendingDueAt(startedAt, state({ endsAt: ms('2026-11-06T10:05Z'), duration: 10 }), ms('2026-11-06T10:02Z'))).toBeNull();
    expect(pendingDueAt(startedAt, state({ endsAt: ms('2026-11-06T10:05Z'), duration: 10 }), ms('2026-11-06T10:05:01Z'))).toBeNull();
  });
  it('is null outside a work session', () => {
    expect(pendingDueAt(null, state(), ms('2026-11-06T10:05Z'))).toBeNull();
  });
});

describe('break notification decision', () => {
  const base = { dueAt: 1000, notifiedFor: null, enabled: true, permission: 'granted', visible: false };
  it('notifies once for a due reminder while the page is out of view', () => {
    expect(shouldNotifyBreak(base)).toBe(true);
    expect(shouldNotifyBreak({ ...base, notifiedFor: 1000 })).toBe(false);
    expect(shouldNotifyBreak({ ...base, notifiedFor: 500 })).toBe(true); // an earlier reminder
  });
  it('stays quiet when the page is in view', () => {
    expect(shouldNotifyBreak({ ...base, visible: true })).toBe(false);
  });
  it('needs the setting, a granted permission and a due reminder', () => {
    expect(shouldNotifyBreak({ ...base, enabled: false })).toBe(false);
    expect(shouldNotifyBreak({ ...base, permission: 'default' })).toBe(false);
    expect(shouldNotifyBreak({ ...base, permission: 'denied' })).toBe(false);
    expect(shouldNotifyBreak({ ...base, permission: 'unsupported' })).toBe(false);
    expect(shouldNotifyBreak({ ...base, dueAt: null })).toBe(false);
  });
});

describe('notifying a due reminder', () => {
  const on = { enabled: true, title: 'Take a break ☕' };
  let shown, store, stored;
  function setup({ permission = 'granted', hidden = true, focused = false, saved = null } = {}) {
    shown = [];
    store = { [BREAK_KEY]: saved ? JSON.stringify(saved) : null };
    stored = () => JSON.parse(store[BREAK_KEY]);
    function Notification(title, options) { shown.push({ title, options }); }
    Notification.permission = permission;
    vi.stubGlobal('window', { Notification, focus: () => {} });
    vi.stubGlobal('document', { hidden, hasFocus: () => focused });
    vi.stubGlobal('localStorage', { getItem: (key) => store[key] ?? null, setItem: (key, value) => { store[key] = value; } });
  }
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows one tagged notification when out of view and marks the reminder handled', () => {
    setup();
    expect(notifyDueBreak(1000, null, on)).toBe(1000);
    expect(shown).toEqual([{ title: 'Take a break ☕', options: { tag: 'kindle-break' } }]);
    expect(stored().notifiedFor).toBe(1000); // saved at once for other tabs
    expect(notifyDueBreak(1000, 1000, on)).toBeNull();
    expect(shown).toHaveLength(1);
  });
  it('counts an unfocused but not hidden window as out of view', () => {
    setup({ hidden: false, focused: false });
    notifyDueBreak(1000, null, on);
    expect(shown).toHaveLength(1);
  });
  it('marks a reminder that became due in view without notifying, so hiding later stays quiet', () => {
    setup({ hidden: false, focused: true });
    expect(notifyDueBreak(1000, null, on)).toBe(1000);
    expect(shown).toHaveLength(0);
    setup();
    expect(notifyDueBreak(1000, 1000, on)).toBeNull();
    expect(shown).toHaveLength(0);
  });
  it('skips a reminder another tab or an earlier load already notified', () => {
    setup({ saved: { notifiedFor: 1000 } });
    expect(notifyDueBreak(1000, null, on)).toBe(1000);
    expect(shown).toHaveLength(0);
  });
  it('stays quiet when off, not granted, unsupported or nothing is due', () => {
    setup();
    notifyDueBreak(1000, null, { enabled: false, title: 'x' });
    setup({ permission: 'denied' });
    notifyDueBreak(1000, null, on);
    expect(shown).toHaveLength(0);
    vi.stubGlobal('window', {});
    expect(() => notifyDueBreak(1000, null, on)).not.toThrow();
    expect(notifyDueBreak(null, null, on)).toBeNull();
  });
});

describe('break countdown arithmetic', () => {
  it('formats the time left as mm:ss, rounding up to whole seconds and stopping at 00:00', () => {
    expect(formatRemaining(10 * 60000)).toBe('10:00');
    expect(formatRemaining(10 * 60000 - 1)).toBe('10:00');
    expect(formatRemaining(10 * 60000 - 1000)).toBe('09:59');
    expect(formatRemaining(9 * 60000 + 1)).toBe('09:01');
    expect(formatRemaining(30 * 60000)).toBe('30:00');
    expect(formatRemaining(61000)).toBe('01:01');
    expect(formatRemaining(1)).toBe('00:01');
    expect(formatRemaining(0)).toBe('00:00');
    expect(formatRemaining(-5000)).toBe('00:00');
    expect(formatRemaining(NaN)).toBe('00:00');
  });
  it('recovers from missing or corrupt saved state', () => {
    expect(normalizeBreakState(null)).toEqual({ closedAt: null, endsAt: null, duration: null, notifiedFor: null });
    expect(normalizeBreakState({ closedAt: 'now', endsAt: 'soon', duration: 12 })).toEqual({ closedAt: null, endsAt: null, duration: null, notifiedFor: null });
    expect(normalizeBreakState({ closedAt: 5, endsAt: 1, duration: 15 })).toEqual({ closedAt: 5, endsAt: 1, duration: 15, notifiedFor: null });
    expect(normalizeBreakState({ notifiedFor: 1234 }).notifiedFor).toBe(1234);
    expect(normalizeBreakState({ notifiedFor: 'x' }).notifiedFor).toBeNull();
    // Saved state from the old o'clock schedule is dropped harmlessly.
    expect(normalizeBreakState({ handledSlot: '2026-11-06-10' })).toEqual({ closedAt: null, endsAt: null, duration: null, notifiedFor: null });
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
  const NOW = ms('2026-11-06T10:30:00Z');
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });
  const render = (props) => renderToStaticMarkup(<BreakDialog language="zh" onDismiss={() => {}} onStart={() => {}} {...props} />);
  const resting = (left, props = {}) => render({ mode: 'running', endsAt: NOW + left, duration: 10, ...props });
  it('prompts with the coffee title, three durations and both actions', () => {
    const markup = render({ mode: 'prompt' });
    expect(markup).toContain('Take a break');
    expect(markup).toContain('lucide-coffee');
    expect(markup).toMatch(/<option value="10" selected="">10分钟<\/option><option value="15">15分钟<\/option><option value="30">30分钟<\/option>/);
    expect(markup.indexOf('下次吧')).toBeLessThan(markup.indexOf('开始吧'));
    expect(markup).toContain('class="break-close"');
  });
  it('replaces the prompt with a resting pill: only mm:ss, the bar and the close button', () => {
    const markup = resting(14 * 60000 + 30500, { duration: 15 });
    expect(markup).toContain('<span class="time-hours">14</span><span class="time-colon">:</span><span class="time-minutes">31</span>');
    expect(markup).toMatch(/class="break-countdown"[^>]*role="timer"/);
    // No visible caption or minutes suffix; the name is kept for screen readers only.
    expect(markup).not.toMatch(/>[^<]*继续休息[^<]*</);
    expect(markup).not.toContain('分钟');
    expect(markup).toContain('aria-label="继续休息 14:31"');
    expect(markup).not.toContain('<h2');
    expect(markup).not.toContain('<select');
    expect(markup).not.toContain('下次吧');
    expect(markup).toContain('class="break-close"');
    expect(markup).toContain('aria-label="关闭"');
  });
  it('is a non-blocking pill: its own layer without the dimming overlay, not modal', () => {
    const markup = resting(9 * 60000);
    expect(markup).toContain('class="settings-layer break-layer break-layer--resting"');
    expect(markup).toContain('class="settings-panel break-panel break-panel--pill"');
    expect(markup).not.toContain('aria-modal="true"');
    expect(render({ mode: 'prompt' })).toContain('aria-modal="true"');
    expect(render({ mode: 'prompt' })).not.toContain('break-layer--resting');
    expect(render({ mode: 'welcome' })).not.toContain('break-panel--pill');
  });
  it('uses flip cards for mm:ss when the flip clock style is on', () => {
    const markup = resting(9 * 60000 + 59000, { clockStyle: 'flip' });
    expect(markup).toContain('flip-clock--break');
    expect(markup).toMatch(/flip-card--hours"><span class="flip-half flip-top" aria-hidden="true"><span class="flip-digits">09</);
    expect(markup).toMatch(/flip-card--minutes"><span class="flip-half flip-top" aria-hidden="true"><span class="flip-digits">59</);
    expect(markup).toContain('aria-label="继续休息 09:59"');
    expect(markup).not.toContain('time-digits');
  });
  it('shows a progress bar under the countdown filled to the elapsed share', () => {
    const markup = resting(5.25 * 60000);
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
    const en = resting(3 * 60000, { language: 'en' });
    expect(en).toContain('aria-label="Keep resting 03:00"');
    expect(en).not.toContain(' min');
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
    expect(running).toContain('break-panel--pill');
    expect(running).toContain('<span class="time-hours">14</span><span class="time-colon">:</span><span class="time-minutes">30</span>');
    expect(running).toMatch(/aria-valuenow="3".*style="width:3\.33/);
    expect(renderApp({ breakReminder: true }, { closedAt: ms('2026-11-06T09:45Z'), endsAt: Date.now() - 1 })).not.toContain('break-panel');
  });
  it('keeps the page usable while resting: theme toggle shown, only blocking dialogs hide it', () => {
    const resting = renderApp({ breakReminder: true }, { closedAt: ms('2026-11-06T09:00Z'), endsAt: Date.now() + 5 * 60000, duration: 10 });
    expect(resting).toContain('break-layer--resting');
    expect(resting).toContain('class="theme-toggle"');
    const prompt = renderApp({ breakReminder: true });
    expect(prompt).toContain('Take a break');
    expect(prompt).not.toContain('class="theme-toggle"');
  });
  it('does not prompt after the eight-hour session is over', () => {
    vi.setSystemTime(new Date('2026-11-06T16:30:00Z')); // 18:30, session ended 18:00
    expect(renderApp({ breakReminder: true })).not.toContain('break-panel');
  });
});
