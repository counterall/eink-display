import { dateKey } from './model';
import { WORK_END_HOUR, WORK_START_HOUR } from './workday';

export const BREAK_DURATIONS = [10, 15, 30];

// Receives the primary city's shifted UTC date. A reminder is due once at the
// top of each completed work hour (10:00–16:00 on weekdays) and stays due for
// the rest of that hour, so a sleeping Kindle still sees it after waking.
export function breakSlot(localDate) {
  const weekday = localDate.getUTCDay();
  if (weekday === 0 || weekday === 6) return null;
  const hour = localDate.getUTCHours();
  if (hour <= WORK_START_HOUR || hour >= WORK_END_HOUR) return null;
  return `${dateKey(localDate)}-${hour}`;
}

export function remainingMinutes(endsAt, nowMs) {
  return Math.max(0, Math.ceil((endsAt - nowMs) / 60000));
}

export function normalizeBreakState(value) {
  const state = { handledSlot: null, endsAt: null, duration: null };
  if (!value || typeof value !== 'object') return state;
  if (typeof value.handledSlot === 'string') state.handledSlot = value.handledSlot;
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
