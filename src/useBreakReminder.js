import { useEffect, useState } from 'react';
import { readStored, writeStored } from './model';
import { breakDue, elapsedPercent, nextBreakAt, normalizeBreakState, remainingMinutes } from './breaks';

export const BREAK_KEY = 'kindle-break-v1';

// Owns the reminder lifecycle. `now` is the app's minute clock; the running
// break and the next due reminder keep their own timers so they don't wait for it.
export default function useBreakReminder(enabled, startedAt, now) {
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

  // A finished break closes the window at its end time, which starts the next
  // hour; a disabled one closes now. Neither may leave a stale end time.
  useEffect(() => {
    if (state.endsAt !== null && (!enabled || state.endsAt <= nowMs)) setState((old) => ({ ...old, closedAt: Math.min(old.endsAt, Date.now()), endsAt: null }));
  }, [enabled, state.endsAt, nowMs]);

  const due = enabled && breakDue(startedAt, state.closedAt, nowMs);
  const nextAt = enabled && !running && !due ? nextBreakAt(startedAt, state.closedAt) : null;
  useEffect(() => {
    if (nextAt === null || nextAt <= Date.now()) return undefined;
    const timer = setTimeout(() => setNowMs(Date.now()), nextAt - Date.now() + 20);
    return () => clearTimeout(timer);
  }, [nextAt]);

  // A one-off prompt requested from settings, independent of the hourly schedule.
  const [forced, setForced] = useState(false);
  const prompt = !running && ((enabled && forced) || due);
  const close = () => { setForced(false); setState((old) => ({ ...old, closedAt: Date.now(), endsAt: null })); };

  return {
    mode: running ? 'running' : prompt ? 'prompt' : null,
    minutesLeft: running ? remainingMinutes(state.endsAt, nowMs) : 0,
    elapsed: running ? elapsedPercent(state.endsAt, state.duration, nowMs) : 0,
    openNow: () => setForced(true),
    // Closing any reminder window (including the "new day" one) restarts the hour.
    dismiss: close,
    start: (minutes) => { const startedAtMs = Date.now(); setNowMs(startedAtMs); setForced(false); setState((old) => ({ ...old, endsAt: startedAtMs + minutes * 60000, duration: minutes })); },
  };
}
