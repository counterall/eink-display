import { useEffect, useState } from 'react';

// The top pills (break prompt and resting countdown, issue #37) slide up and fade out over
// PILL_CLOSE_MS before they unmount. `animationend` normally ends that; the fallback timer makes
// sure the pill still goes away if the event never fires (e.g. the tab was hidden meanwhile).
export const PILL_CLOSE_MS = 250;
export const PILL_CLOSE_FALLBACK_MS = PILL_CLOSE_MS + 100;

// Which pill, if any, should stay mounted to slide away: the one that was showing when the
// pill went away entirely. A pill turning into another (Let's go: prompt → countdown) keeps its
// spot without animating, and with reduced motion or a hidden tab it simply disappears.
export function closingPill(previous, current, { reducedMotion, hidden }) {
  if (!previous || current || reducedMotion || hidden) return null;
  return previous;
}

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// `pill` is { mode, endsAt, duration } while a top pill is showing, otherwise null. Returns the
// pill to render in its closing state (or null) and `finish` to unmount it on `animationend`.
// The break logic itself has already run when the pill starts closing; this is only the look.
// The change is picked up during render (not in an effect), so the dialog in the same spot is
// never unmounted in between: it keeps its state (e.g. the chosen chip) while it slides away.
export default function useClosingPill(pill) {
  const key = pill ? `${pill.mode}|${pill.endsAt}` : null;
  const [seen, setSeen] = useState({ key, pill, closing: null });
  if (seen.key !== key) {
    const closing = closingPill(seen.pill, pill, { reducedMotion: prefersReducedMotion(), hidden: document.hidden });
    setSeen({ key, pill, closing });
  }
  const { closing } = seen;
  useEffect(() => {
    if (!closing) return undefined;
    const timer = setTimeout(() => setSeen((old) => (old.closing === closing ? { ...old, closing: null } : old)), PILL_CLOSE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [closing]);
  return { closing, finish: () => setSeen((old) => ({ ...old, closing: null })) };
}
