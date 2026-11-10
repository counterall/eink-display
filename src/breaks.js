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

// Once due, the reminder stays due until handled, so a sleeping Kindle still
// sees it after waking, but never outside the running work session.
export function breakDue(startedAt, closedAt, nowMs) {
  const due = nextBreakAt(startedAt, closedAt);
  return due !== null && nowMs >= due && workActive(startedAt, nowMs);
}

export function remainingMinutes(endsAt, nowMs) {
  return Math.max(0, Math.ceil((endsAt - nowMs) / 60000));
}

export function normalizeBreakState(value) {
  const state = { closedAt: null, endsAt: null, duration: null };
  if (!value || typeof value !== 'object') return state;
  if (Number.isFinite(value.closedAt)) state.closedAt = value.closedAt;
  if (Number.isFinite(value.endsAt)) state.endsAt = value.endsAt;
  if (BREAK_DURATIONS.includes(value.duration)) state.duration = value.duration;
  return state;
}

// Share of the break already elapsed, 0–100, from the end time and total length.
export function elapsedPercent(endsAt, duration, nowMs) {
  if (!Number.isFinite(endsAt) || !duration) return 0;
  const total = duration * 60000;
  return Math.min(100, Math.max(0, (total - (endsAt - nowMs)) / total * 100));
}
