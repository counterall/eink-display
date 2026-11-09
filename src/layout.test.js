import { describe, expect, it } from 'vitest';
import { KINDLE_REFERENCE, primaryTimeFontSize, viewportLayout } from './layout';

describe('1072 × 1448 Kindle layout', () => {
  it.each([[70, .7], [100, 1], [130, 1.3], [150, 1.5]])('applies %s%% zoom to base and clock typography without changing dimensions', (zoom, factor) => {
    for (const showFeeds of [true, false]) {
      const base = viewportLayout(1072, 1448, 'cw', showFeeds);
      const zoomed = viewportLayout(1072, 1448, 'cw', showFeeds, zoom);
      expect(zoomed.style.fontSize).toBeCloseTo(base.style.fontSize * factor);
      expect(zoomed.style.width).toBe(base.style.width);
      expect(zoomed.style.transform).toBe(base.style.transform);
      expect(primaryTimeFontSize(1448, 1072, showFeeds, zoom)).toBeCloseTo(primaryTimeFontSize(1448, 1072, showFeeds) * factor);
    }
  });
  it('enlarges fullscreen typography without changing rotation or viewport dimensions', () => {
    const split = viewportLayout(1072, 1448, 'cw', true);
    const full = viewportLayout(1072, 1448, 'cw', false);
    expect(full.width).toBe(split.width);
    expect(full.height).toBe(split.height);
    expect(full.style.transform).toBe(split.style.transform);
    expect(full.style.fontSize).toBe(29);
    expect(full.style.fontSize).toBeGreaterThan(split.style.fontSize);
  });
  it.each([[1448, 1072], [724, 536], [483, 357], [1121, 743]])('makes the primary clock larger in fullscreen at %s × %s', (width, height) => {
    expect(primaryTimeFontSize(width, height, false)).toBeGreaterThan(primaryTimeFontSize(width, height, true));
    expect(viewportLayout(width, height, 'none', false).style.fontSize).toBeGreaterThan(viewportLayout(width, height, 'none', true).style.fontSize);
  });
  it('uses the native landscape size as its typography reference', () => {
    const layout = viewportLayout(1448, 1072);
    expect(layout.width).toBe(KINDLE_REFERENCE.width);
    expect(layout.height).toBe(KINDLE_REFERENCE.height);
    expect(layout.style.fontSize).toBe(24);
    expect(layout.style.transform).toBe('none');
  });
  it('automatically rotates the portrait browser without changing its aspect ratio', () => {
    const layout = viewportLayout(1072, 1448);
    expect(layout.width).toBe(1448);
    expect(layout.height).toBe(1072);
    expect(layout.style).toMatchObject({ left: 1072, top: 0, transform: 'rotate(90deg)', fontSize: 24 });
  });
  it('supports counterclockwise placement', () => {
    expect(viewportLayout(1072, 1448, 'ccw').style).toMatchObject({ width: 1448, height: 1072, left: 0, top: 1448, transform: 'rotate(-90deg)' });
  });
  it('supports explicitly clockwise placement', () => {
    expect(viewportLayout(1072, 1448, 'cw').style).toMatchObject({ width: 1448, height: 1072, left: 1072, top: 0, transform: 'rotate(90deg)' });
  });
  it('respects no-rotation mode', () => {
    expect(viewportLayout(1072, 1448, 'none').style).toMatchObject({ width: 1072, height: 1448, left: 0, top: 0, transform: 'none' });
  });
  it.each([2, 3])('scales correctly when the CSS viewport is physical resolution / %s', (ratio) => {
    const layout = viewportLayout(1072 / ratio, 1448 / ratio);
    expect(layout.width).toBeCloseTo(1448 / ratio);
    expect(layout.height).toBeCloseTo(1072 / ratio);
    expect(layout.style.fontSize).toBeCloseTo(24 / ratio);
  });
  it('fits a shorter viewport when browser chrome takes some height', () => {
    const layout = viewportLayout(1072, 1320);
    expect(layout.width).toBe(1320);
    expect(layout.height).toBe(1072);
    expect(layout.style.fontSize).toBeCloseTo(24 * 1320 / 1448);
  });
  it('scales down for the smaller preview without hard-coding the native size', () => {
    const layout = viewportLayout(600, 800);
    expect(layout.style.fontSize).toBeCloseTo(24 * 800 / 1448);
    expect(layout.style.width).toBe(800);
    expect(layout.style.height).toBe(600);
  });
  it('caps desktop typography rather than growing without a limit', () => {
    expect(viewportLayout(3840, 2160).style.fontSize).toBe(24);
  });
  it.each([[0, 0], [NaN, undefined]])('does not produce NaN dimensions for an unavailable viewport %s × %s', (width, height) => {
    const layout = viewportLayout(width, height);
    expect(layout.width).toBe(1);
    expect(layout.height).toBe(1);
    expect(Number.isFinite(layout.style.fontSize)).toBe(true);
  });
});
