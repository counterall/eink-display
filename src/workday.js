import { cityDate, dateKey } from './model';

export const WORK_MINUTES = 8 * 60;

// The work session begins when "Start work" is pressed, floored to the whole
// minute so its end lands exactly on the app's minute clock tick.
export function workStartAt(nowMs) {
  return nowMs - nowMs % 60000;
}

export function workEndAt(startedAt) {
  return startedAt + WORK_MINUTES * 60000;
}

export function normalizeWorkState(value) {
  const startedAt = value && typeof value === 'object' && Number.isFinite(value.startedAt) ? workStartAt(value.startedAt) : null;
  return { startedAt };
}

export function workActive(startedAt, nowMs) {
  return startedAt !== null && nowMs >= startedAt && nowMs < workEndAt(startedAt);
}

// A running session always shows its countdown (even past midnight). Otherwise
// the weekend message wins, then "work is over" for a session that started on
// the primary city's current calendar day, else the "Start work" button.
export function workdayState(city, now, startedAt) {
  const nowMs = now.getTime();
  if (workActive(startedAt, nowMs)) {
    // Ignore seconds so a session started at 10:23 still shows 08:00 at 10:23:59.
    const remaining = (workEndAt(startedAt) - workStartAt(nowMs)) / 60000;
    return { type: 'working', hours: Math.floor(remaining / 60), minutes: remaining % 60 };
  }
  const local = cityDate(city, now);
  const weekday = local.getUTCDay();
  if (weekday === 0 || weekday === 6) return { type: 'weekend' };
  if (startedAt !== null && dateKey(cityDate(city, new Date(startedAt))) === dateKey(local)) return { type: 'rest' };
  return { type: 'idle' };
}
