import { describe, expect, it } from 'vitest';
import { flipTimeFontSize, layoutMode, primaryTimeFontSize, viewportLayout } from './layout';

// Common desktop and tablet CSS viewports (issue #21).
const DESKTOPS = [[1280, 800], [1366, 768], [1440, 900], [1536, 864], [1920, 1080], [2560, 1440]];
const TABLETS_LANDSCAPE = [[1024, 768], [1180, 820], [1194, 834], [1366, 1024], [1280, 800]];
const TABLETS_PORTRAIT = [[768, 1024], [820, 1180], [834, 1194], [1024, 1366], [800, 1280]];

describe('responsive base size', () => {
  it('keeps the old 24px base at 1448 × 1072, with no rotation', () => {
    const layout = viewportLayout(1448, 1072);
    expect(layout).toMatchObject({ width: 1448, height: 1072, mode: 'split' });
    expect(layout.style).toEqual({ width: 1448, height: 1072, fontSize: 24 });
  });
  it('never rotates: the stage is the viewport in every orientation', () => {
    for (const [w, h] of [...DESKTOPS, ...TABLETS_PORTRAIT]) {
      for (const showFeeds of [true, false]) {
        const { style } = viewportLayout(w, h, showFeeds);
        expect(style.width).toBe(w);
        expect(style.height).toBe(h);
        expect(style).not.toHaveProperty('transform');
      }
    }
  });
  it('picks split for landscape, stacked for portrait, fullscreen without the right column', () => {
    expect(layoutMode(1920, 1080, true)).toBe('split');
    expect(layoutMode(768, 1024, true)).toBe('stacked');
    expect(layoutMode(768, 1024, false)).toBe('fullscreen');
    expect(layoutMode(1920, 1080, false)).toBe('fullscreen');
    expect(viewportLayout(834, 1194).mode).toBe('stacked');
  });
  it('grows on large desktops instead of staying at 24px, up to twice the reference', () => {
    expect(viewportLayout(2560, 1440).style.fontSize).toBeCloseTo(24 * 1440 / 1072);
    expect(viewportLayout(2560, 1440).style.fontSize).toBeGreaterThan(viewportLayout(1920, 1080).style.fontSize);
    expect(viewportLayout(7680, 4320).style.fontSize).toBe(48);
  });
  it('scales down for smaller desktops and tablets', () => {
    expect(viewportLayout(1280, 800).style.fontSize).toBeCloseTo(24 * 800 / 1072);
    expect(viewportLayout(1024, 768).style.fontSize).toBeCloseTo(24 * 1024 / 1448);
  });
  it('uses a taller reference when Trending is stacked under the clock', () => {
    expect(viewportLayout(768, 1024).style.fontSize).toBeCloseTo(24 * 1024 / 1720);
    expect(viewportLayout(768, 1024, false).style.fontSize).toBeCloseTo(29 * 768 / 1200);
  });
  it('makes fullscreen typography larger than the split layout', () => {
    for (const [w, h] of [[1448, 1072], [724, 536], [1121, 743], ...DESKTOPS]) {
      expect(viewportLayout(w, h, false).style.fontSize).toBeGreaterThan(viewportLayout(w, h, true).style.fontSize);
      expect(primaryTimeFontSize(w, h, 'fullscreen')).toBeGreaterThan(primaryTimeFontSize(w, h, 'split'));
    }
    expect(viewportLayout(1448, 1072, false).style.fontSize).toBe(29);
  });
  it.each([[70, .7], [100, 1], [130, 1.3], [150, 1.5]])('applies %s%% zoom to base and clock typography without changing dimensions', (zoom, factor) => {
    for (const showFeeds of [true, false]) {
      for (const [w, h] of [[1448, 1072], [768, 1024]]) {
        const base = viewportLayout(w, h, showFeeds);
        const zoomed = viewportLayout(w, h, showFeeds, zoom);
        expect(zoomed.style.fontSize).toBeCloseTo(base.style.fontSize * factor);
        expect(zoomed.style.width).toBe(base.style.width);
        expect(primaryTimeFontSize(w, h, base.mode, zoom)).toBeCloseTo(primaryTimeFontSize(w, h, base.mode) * factor);
        expect(flipTimeFontSize(w, h, base.mode, zoom)).toBeCloseTo(flipTimeFontSize(w, h, base.mode) * factor);
      }
    }
  });
  it.each([[0, 0], [NaN, undefined]])('does not produce NaN dimensions for an unavailable viewport %s × %s', (width, height) => {
    const layout = viewportLayout(width, height);
    expect(layout.width).toBe(1);
    expect(layout.height).toBe(1);
    expect(Number.isFinite(layout.style.fontSize)).toBe(true);
  });
});

// Width arithmetic from styles.css: dashboard padding 2.3em per side (1.6em when compact,
// under 650px wide), clock panel padding-right 1.4em in split mode.
const compact = (w) => w < 650;
const pagePadding = (w) => 2 * (compact(w) ? 1.6 : 2.3);
function clockColumn(w, h, showFeeds) {
  const { mode, style: { fontSize: base } } = viewportLayout(w, h, showFeeds);
  if (mode === 'split') return w / 2 - (pagePadding(w) / 2 + (compact(w) ? 1.2 : 1.4)) * base;
  return w - pagePadding(w) * base;
}
// A card is 1.25em wide and the cards sit .12em apart (see styles.css).
const cardsWidth = (fontSize, cards) => fontSize * (cards * 1.25 + (cards - 1) * .12);

describe('clock sizing fits the column', () => {
  const sizes = [[1448, 1072], [1121, 743], [724, 536], [600, 400], ...DESKTOPS, ...TABLETS_LANDSCAPE, ...TABLETS_PORTRAIT];
  it.each(sizes)('fits three flip cards and the classic HH:MM in the clock column at %s × %s', (w, h) => {
    for (const showFeeds of [true, false]) {
      const { mode } = viewportLayout(w, h, showFeeds);
      const column = clockColumn(w, h, showFeeds);
      expect(cardsWidth(flipTimeFontSize(w, h, mode), 3)).toBeLessThanOrEqual(column);
      expect(primaryTimeFontSize(w, h, mode) * 2.38).toBeLessThanOrEqual(column);
    }
  });
  it.each(sizes)('fits the tile time and the 今天 / MM-DD label in a half-width tile at %s × %s', (w, h) => {
    for (const showFeeds of [true, false]) {
      const { mode, style: { fontSize: base } } = viewportLayout(w, h, showFeeds);
      const full = mode === 'fullscreen';
      const tile = clockColumn(w, h, showFeeds) / 2 - (full ? 1.6 : 1.1) * base; // .second-clock padding-right
      const cards = cardsWidth((full ? 3.8 : 3.1) * base, 2);
      // Classic 12-hour: Roboto Condensed HH:MM (2.38em) + AM/PM (.3em text, .35em margin, at the digit size).
      const classic = (full ? 4.4 : 3.3) * base * (2.38 + .3 * (1.2 + .35));
      const label = (full ? 1 : .8) * base * (.6 + 2.6); // margin + "11-25" in Arial (wider than 今天)
      expect(cards + label).toBeLessThanOrEqual(tile);
      expect(classic + label).toBeLessThanOrEqual(tile);
    }
  });
  it('keeps the issue #15 sizes in the landscape split and fullscreen layouts', () => {
    expect(flipTimeFontSize(1448, 1072, 'split')).toBeGreaterThan(1448 * .105);
    expect(flipTimeFontSize(1448, 1072, 'fullscreen')).toBeGreaterThan(1072 * .205);
    expect(primaryTimeFontSize(1448, 1072, 'fullscreen')).toBeGreaterThan(1072 * .31);
    expect(primaryTimeFontSize(1448, 1072, 'split')).toBeGreaterThan(1448 * .17);
  });
  it('keeps the flip card height close to the classic clock height', () => {
    for (const [w, h, mode] of [[1448, 1072, 'split'], [768, 1024, 'stacked'], [1920, 1080, 'fullscreen']]) {
      // Classic digits use line-height .8; a flip card is 1.2em tall.
      const classic = primaryTimeFontSize(w, h, mode) * .8;
      const flip = flipTimeFontSize(w, h, mode) * 1.2;
      expect(flip).toBeGreaterThan(classic * .8);
      expect(flip).toBeLessThan(classic * 1.1);
    }
  });
  it('keeps the stacked main clock clearly larger than the tile clocks', () => {
    for (const [w, h] of TABLETS_PORTRAIT) {
      const base = viewportLayout(w, h).style.fontSize;
      expect(primaryTimeFontSize(w, h, 'stacked')).toBeGreaterThan(3.3 * base * 1.5);
    }
  });
});
