import { useEffect, useState } from 'react';
import { cityDate, readStored, writeStored } from './model';
import { breakSlot, elapsedPercent, normalizeBreakState, remainingMinutes } from './breaks';

export const BREAK_KEY = 'kindle-break-v1';

// Owns the reminder lifecycle. `now` is the app's minute clock; the running
// break keeps its own timers so it can end mid-minute without waiting for it.
export default function useBreakReminder(enabled, city, now) {
  const [state, setState] = useState(() => normalizeBreakState(readStored(BREAK_KEY)));
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => { writeStored(BREAK_KEY, state); }, [state]);
  useEffect(() => { setNowMs(Date.now()); }, [now]);

  const running = enabled && state.endsAt !== null && state.endsAt > nowMs;
  useEffect(() => {
    if (!running) return undefined;
    // Re-render at each remaining-minute boundary and exactly at the end.
    const untilBoundary = (state.endsAt - Date.now()) % 60000 || 60000;
    const timer = setTimeout(() => setNowMs(Date.now()), Math.max(50, untilBoundary + 20));
    return () => clearTimeout(timer);
  }, [running, state.endsAt, nowMs]);

  // A finished or disabled break must not reopen, and must not leave a stale end time.
  useEffect(() => {
    if (state.endsAt !== null && (!enabled || state.endsAt <= nowMs)) setState((old) => ({ ...old, endsAt: null }));
  }, [enabled, state.endsAt, nowMs]);

  const slot = enabled ? breakSlot(cityDate(city, now)) : null;
  // A one-off prompt requested from settings, independent of the hourly schedule.
  const [forced, setForced] = useState(false);
  const prompt = !running && ((enabled && forced) || (slot !== null && state.handledSlot !== slot));
  const handle = (extra) => { setForced(false); setState((old) => ({ ...old, handledSlot: slot || old.handledSlot, ...extra })); };

  return {
    mode: running ? 'running' : prompt ? 'prompt' : null,
    minutesLeft: running ? remainingMinutes(state.endsAt, nowMs) : 0,
    elapsed: running ? elapsedPercent(state.endsAt, state.duration, nowMs) : 0,
    openNow: () => setForced(true),
    dismiss: () => handle({ endsAt: null }),
    start: (minutes) => { const startedAt = Date.now(); setNowMs(startedAt); handle({ endsAt: startedAt + minutes * 60000, duration: minutes }); },
  };
}
