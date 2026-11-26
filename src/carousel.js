// Right-column carousel (issue #23): slide order and rotation timing as pure functions.
// To add a slide, add one entry here (and a period in trendingData.js / strings in i18n.js).
export const CAROUSEL_SLIDES = [
  { id: 'weekly', period: 'weekly' },
  { id: 'daily', period: 'daily' },
];
export const CAROUSEL_INTERVALS = [10, 30, 60];
export const DEFAULT_CAROUSEL_INTERVAL = 10;
export const MINUTE_MS = 60 * 1000;

// Always starts on the first slide; the current slide is not remembered across reloads.
// `interval` (minutes) is fixed at each switch, so a settings change applies from the next one.
export const initialCarousel = (nowMs, interval = DEFAULT_CAROUSEL_INTERVAL) => ({ index: 0, switchedAt: nowMs, interval });

const wrap = (index, count) => ((index % count) + count) % count;

// A manual change (arrow, dot, key, swipe) or an automatic one: restarts the countdown.
export function goToSlide(state, index, { count, nowMs, interval }) {
  return { index: wrap(index, count), switchedAt: nowMs, interval };
}

export function carouselDue(state, nowMs, paused = false) {
  return !paused && nowMs - state.switchedAt >= state.interval * MINUTE_MS;
}

// Called on the app's once-a-minute tick: advance (wrapping) if due and not paused.
export function tickCarousel(state, { count, nowMs, interval, paused }) {
  if (count < 2 || !carouselDue(state, nowMs, paused)) return state;
  return goToSlide(state, state.index + 1, { count, nowMs, interval });
}

// A horizontal touch swipe: at least 40px, and more sideways than vertical. -1 = previous.
export function swipeDirection(dx, dy) {
  if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}
