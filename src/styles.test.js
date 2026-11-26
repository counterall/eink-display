import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('clock footer spacing (issue #17)', () => {
  it('leaves a wider gap between the bottom tiles and the action buttons', () => {
    expect(rule('.clock-footer')).toMatch(/padding-top:\s*1\.8em/);
  });
  it('keeps the fullscreen footer pinned top right with no top padding', () => {
    const fullscreen = rule('.stage--fullscreen .clock-footer');
    expect(fullscreen).toMatch(/position:\s*absolute/);
    expect(fullscreen).toMatch(/padding-top:\s*0\s*(;|$)/);
  });
  it('does not resize the main clock area', () => {
    expect(rule('.primary-clock')).toMatch(/padding:\s*\.5em 0 \.9em/);
    expect(rule('.primary-time')).toMatch(/flex:\s*1/);
  });
});

describe('theme variables (issue #21)', () => {
  const block = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
    return match ? match[1] : null;
  };
  const variables = (text) => Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
  const light = variables(css.match(/\n:root, \.stage \{\n([^}]*)\}/)[1]);
  it('defines the same variables for every theme, light on :root', () => {
    expect(Object.keys(light).length).toBeGreaterThan(8);
    for (const theme of ['dark', 'sky', 'sage', 'lavender', 'mint']) {
      expect(Object.keys(variables(block(`.theme--${theme}`))).sort()).toEqual(Object.keys(light).sort());
    }
  });
  it('uses each theme page colour from THEME_COLORS as --bg', () => {
    expect(light['--bg']).toBe('#fff');
    expect(variables(block('.theme--dark'))['--bg']).toBe('#000');
    for (const [theme, color] of [['sky', '#eef4fb'], ['sage', '#eef5ec'], ['lavender', '#f3f0fa'], ['mint', '#eaf5f3']]) {
      expect(variables(block(`.theme--${theme}`))['--bg']).toBe(color);
    }
  });
  it('has no per-theme selector lists any more: colours live only in the variable blocks', () => {
    expect(css).not.toMatch(/\.stage\.theme--/);
    const outside = css.replace(/(?:^|\n)(?::root, \.stage|\.theme--\w+) \{[^}]*\}/g, '');
    expect(outside).not.toMatch(/#[0-9a-f]{3,6}\b|rgba?\(/i);
  });
  it('keeps the pressed break close button readable (white on the filled background)', () => {
    expect(rule('.break-panel .break-close:active')).toMatch(/color:\s*var\(--on-strong\)/);
  });
  it('animates the flip cards, but not with reduced motion', () => {
    expect(rule('.flip-flap--top.flip-flap--turn')).toMatch(/animation:\s*flip-fold/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[^}]*animation: none;/);
  });
  it('stacks Trending under the clock in portrait instead of rotating the page', () => {
    expect(css).not.toMatch(/rotate\(90deg\)|transform-origin: 0 0/);
    expect(rule('.stage--stacked .dashboard')).toMatch(/flex-direction:\s*column/);
    expect(rule('.stage--stacked .feeds-panel')).toMatch(/width:\s*100%/);
  });
});

describe('Trending carousel styles (issue #23)', () => {
  it('slides the track for about 400 ms, and swaps instantly with reduced motion', () => {
    expect(rule('.carousel-track')).toMatch(/transition:\s*transform 400ms ease-out/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.carousel-track[^{]*\{ transition: none; \} \}/);
  });
  it('shows the arrows on hover or focus, and always on touch screens', () => {
    expect(rule('.carousel-arrow')).toMatch(/opacity:\s*0/);
    expect(css).toContain('.trending-carousel:hover .carousel-arrow, .trending-carousel:has(:focus-visible) .carousel-arrow { opacity: 1;');
    expect(css).toMatch(/@media \(hover: none\) \{ \.carousel-arrow \{ opacity: 1;/);
    expect(rule('.carousel-arrow')).toMatch(/background:\s*var\(--card\)/);
    expect(rule('.carousel-arrow')).toMatch(/border-radius:\s*50%/);
  });
  it('gives each dot a 44px hit area and lets stacked slides take the taller height', () => {
    expect(rule('.carousel-dot')).toMatch(/min-width:\s*44px; min-height:\s*44px/);
    expect(rule('.stage--stacked .trending-carousel, .stage--stacked .carousel-viewport, .stage--stacked .carousel-track')).toMatch(/height:\s*auto/);
  });
});
