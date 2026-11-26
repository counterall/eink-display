import { describe, expect, it } from 'vitest';
import { CAROUSEL_SLIDES, carouselDue, goToSlide, initialCarousel, MINUTE_MS, swipeDirection, tickCarousel } from './carousel';

const start = Date.UTC(2026, 10, 26, 8, 0, 0);
const at = (minutes) => start + minutes * MINUTE_MS;
const tick = (state, minutes, extra = {}) => tickCarousel(state, { count: 2, nowMs: at(minutes), interval: 10, paused: false, ...extra });

describe('carousel slides', () => {
  it('shows weekly first, then daily', () => {
    expect(CAROUSEL_SLIDES.map((slide) => slide.period)).toEqual(['weekly', 'daily']);
    expect(initialCarousel(start).index).toBe(0);
  });
});

describe('carousel rotation timing', () => {
  it('is due once the interval since the last switch has passed', () => {
    const state = initialCarousel(start, 10);
    expect(carouselDue(state, at(9.99))).toBe(false);
    expect(carouselDue(state, at(10))).toBe(true);
  });
  it('advances on the minute tick and wraps from the last slide to the first', () => {
    let state = initialCarousel(start, 10);
    state = tick(state, 9);
    expect(state.index).toBe(0);
    state = tick(state, 10);
    expect(state).toEqual({ index: 1, switchedAt: at(10), interval: 10 });
    state = tick(state, 19);
    expect(state.index).toBe(1);
    state = tick(state, 20);
    expect(state.index).toBe(0);
  });
  it('restarts the countdown after a manual change', () => {
    let state = initialCarousel(start, 10);
    state = goToSlide(state, 1, { count: 2, nowMs: at(8), interval: 10 });
    expect(state.index).toBe(1);
    expect(tick(state, 10).index).toBe(1);
    expect(tick(state, 17).index).toBe(1);
    expect(tick(state, 18).index).toBe(0);
  });
  it('wraps manual previous/next in both directions', () => {
    const state = initialCarousel(start);
    expect(goToSlide(state, -1, { count: 2, nowMs: start, interval: 10 }).index).toBe(1);
    expect(goToSlide(state, 2, { count: 2, nowMs: start, interval: 10 }).index).toBe(0);
  });
  it('does not advance while paused (Settings, break dialog, hover), and catches up afterwards', () => {
    const state = initialCarousel(start, 10);
    expect(tick(state, 25, { paused: true })).toBe(state);
    expect(tick(state, 26).index).toBe(1);
  });
  it('applies a changed interval from the next switch', () => {
    let state = initialCarousel(start, 10);
    state = tick(state, 10, { interval: 30 });
    expect(state).toMatchObject({ index: 1, interval: 30 });
    expect(tick(state, 39, { interval: 30 }).index).toBe(1);
    expect(tick(state, 40, { interval: 30 }).index).toBe(0);
  });
  it('never rotates a single slide', () => {
    const state = initialCarousel(start);
    expect(tickCarousel(state, { count: 1, nowMs: at(60), interval: 10 })).toBe(state);
  });
});

describe('swipe detection', () => {
  it('needs a mostly horizontal swipe of at least 40px', () => {
    expect(swipeDirection(-60, 10)).toBe(1);
    expect(swipeDirection(60, -10)).toBe(-1);
    expect(swipeDirection(30, 0)).toBe(0);
    expect(swipeDirection(50, 80)).toBe(0);
  });
});
