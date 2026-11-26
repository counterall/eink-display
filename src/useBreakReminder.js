import { useEffect, useState } from 'react';
import { readStored, writeStored } from './model';
import { breakDue, nextBreakAt, normalizeBreakState, pendingDueAt, shouldNotifyBreak } from './breaks';
import { notificationPermission, pageInView, showBreakNotification } from './notifications';

export const BREAK_KEY = 'kindle-break-v1';

// Run once when a scheduled reminder becomes due (`dueAt`): shows the desktop
// notification if the page is out of view and returns the due time to store as
// handled, or null when this reminder was already handled by this tab.
// Another open tab may have handled it already, so the saved state is checked too.
export function notifyDueBreak(dueAt, handledFor, notification) {
  if (dueAt === null || handledFor === dueAt) return null;
  const stored = normalizeBreakState(readStored(BREAK_KEY));
  const { notifiedFor } = stored;
  // Saved right away (not only via the state effect) so a tab waking in the same moment sees it.
  writeStored(BREAK_KEY, { ...stored, notifiedFor: dueAt });
  if (shouldNotifyBreak({ dueAt, notifiedFor, enabled: notification.enabled, permission: notificationPermission(), visible: pageInView() })) showBreakNotification(notification.title);
  return dueAt;
}

// Owns the reminder lifecycle. `now` is the app's minute clock; the running
// break and the next due reminder keep their own timers so they don't wait for it.
// `notification` ({ enabled, title }) adds a desktop notification for the
// scheduled reminder when the page is out of view.
export default function useBreakReminder(enabled, startedAt, now, notification = { enabled: false, title: '' }) {
  const [state, setState] = useState(() => normalizeBreakState(readStored(BREAK_KEY)));
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => { writeStored(BREAK_KEY, state); }, [state]);
  useEffect(() => { setNowMs(Date.now()); }, [now]);

  const running = enabled && state.endsAt !== null && state.endsAt > nowMs;
  useEffect(() => {
    if (!running) return undefined;
    // Re-render at each remaining-minute boundary and exactly at the end (the
    // resting pill keeps its own once-a-second tick for mm:ss).
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

  // Decided once per scheduled reminder, when it becomes due: notify if the page
  // is out of view, then remember that due time (also when the page was in view)
  // so a reload or a second tab never notifies for it again. The "Now" prompt
  // and the "new day" window are not scheduled reminders and never notify.
  const dueAt = enabled ? pendingDueAt(startedAt, state, nowMs) : null;
  useEffect(() => {
    const handled = notifyDueBreak(dueAt, state.notifiedFor, notification);
    if (handled !== null) setState((old) => ({ ...old, notifiedFor: handled }));
  }, [dueAt]);

  // A one-off prompt requested from settings, independent of the hourly schedule.
  const [forced, setForced] = useState(false);
  const prompt = !running && ((enabled && forced) || due);
  const close = () => { setForced(false); setState((old) => ({ ...old, closedAt: Date.now(), endsAt: null })); };

  return {
    mode: running ? 'running' : prompt ? 'prompt' : null,
    // The running break's end time and length, for the resting pill's own seconds tick.
    endsAt: running ? state.endsAt : null,
    duration: running ? state.duration : null,
    openNow: () => setForced(true),
    // Closing any reminder window (including the "new day" one) restarts the hour.
    dismiss: close,
    start: (minutes) => { const startedAtMs = Date.now(); setNowMs(startedAtMs); setForced(false); setState((old) => ({ ...old, endsAt: startedAtMs + minutes * 60000, duration: minutes })); },
  };
}
