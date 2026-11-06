export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 17;

// Receives the same shifted UTC date used for the selected primary city's
// clock. Ignore seconds so 09:00:00.050 still displays 08:00, not 07:59.
export function workdayState(localDate) {
  const weekday = localDate.getUTCDay();
  if (weekday === 0 || weekday === 6) return { type: 'weekend' };
  const minute = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();
  if (minute < WORK_START_HOUR * 60 || minute >= WORK_END_HOUR * 60) return { type: 'rest' };
  const remaining = WORK_END_HOUR * 60 - minute;
  return { type: 'working', hours: Math.floor(remaining / 60), minutes: remaining % 60 };
}
