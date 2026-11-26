import { workActive, workEndAt } from './workday';

export const BREAK_DURATIONS = [10, 15, 30];
export const BREAK_INTERVAL_MS = 60 * 60000;

// One hour after the reminder window was last closed (or after work started,
// whichever is later). Null when there is no session or the next reminder
// would fall after the session ends.
export function nextBreakAt(startedAt, closedAt) {
  if (startedAt === null) return null;
  const anchor = closedAt !== null && closedAt > startedAt ? closedAt : startedAt;
  const due = anchor + BREAK_INTERVAL_MS;
  return due < workEndAt(startedAt) ? due : null;
}

// Once due, the reminder stays due until handled, so a laptop or tablet that
// slept through it still shows it after waking, but never outside the running
// work session.
export function breakDue(startedAt, closedAt, nowMs) {
  const due = nextBreakAt(startedAt, closedAt);
  return due !== null && nowMs >= due && workActive(startedAt, nowMs);
}

// Due time of the scheduled reminder waiting to be handled, or null. Never
// while a break is running or has just ended (`endsAt` not yet cleared): the
// end of a break closes the window, so it must not count as a due reminder.
export function pendingDueAt(startedAt, state, nowMs) {
  if (state.endsAt !== null || !breakDue(startedAt, state.closedAt, nowMs)) return null;
  return nextBreakAt(startedAt, state.closedAt);
}

export function remainingMinutes(endsAt, nowMs) {
  return Math.max(0, Math.ceil((endsAt - nowMs) / 60000));
}

export function normalizeBreakState(value) {
  const state = { closedAt: null, endsAt: null, duration: null, notifiedFor: null };
  if (!value || typeof value !== 'object') return state;
  if (Number.isFinite(value.closedAt)) state.closedAt = value.closedAt;
  if (Number.isFinite(value.endsAt)) state.endsAt = value.endsAt;
  if (BREAK_DURATIONS.includes(value.duration)) state.duration = value.duration;
  if (Number.isFinite(value.notifiedFor)) state.notifiedFor = value.notifiedFor;
  return state;
}

// Share of the break already elapsed, 0–100, from the end time and total length.
export function elapsedPercent(endsAt, duration, nowMs) {
  if (!Number.isFinite(endsAt) || !duration) return 0;
  const total = duration * 60000;
  return Math.min(100, Math.max(0, (total - (endsAt - nowMs)) / total * 100));
}

// A desktop notification for the scheduled reminder that just became due
// (`dueAt`), at most once per reminder (`notifiedFor` is the due time already
// handled) and only while the dashboard is out of view.
export function shouldNotifyBreak({ dueAt, notifiedFor, enabled, permission, visible }) {
  return Boolean(enabled) && permission === 'granted' && !visible && dueAt !== null && dueAt !== undefined && dueAt !== notifiedFor;
}
