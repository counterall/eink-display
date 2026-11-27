import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const block = rule;
const variables = (text) => Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
const light = variables(css.match(/\n:root, \.stage \{\n([^}]*)\}/)[1]);

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
    expect(rule('.settings-panel .break-close:active')).toMatch(/color:\s*var\(--on-strong\)/);
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
  it('shows the arrows on hover or focus, and at half strength on touch screens (issue #25)', () => {
    expect(rule('.carousel-arrow')).toMatch(/opacity:\s*0/);
    expect(css).toContain('.trending-carousel:hover .carousel-arrow, .trending-carousel:has(:focus-visible) .carousel-arrow { opacity: 1;');
    const touch = css.match(/@media \(hover: none\) \{([\s\S]*?)\n\}/)[1];
    // Half strength even while a tap leaves :hover stuck on the carousel.
    expect(touch).toContain('.carousel-arrow, .trending-carousel:hover .carousel-arrow { opacity: .5; pointer-events: auto; }');
    expect(touch).toContain('.trending-carousel .carousel-arrow .carousel-arrow-disc { border-color: transparent; }');
    // Pressed or keyboard-focused arrows are full strength on touch screens too.
    expect(touch).toContain('.trending-carousel .carousel-arrow:active, .trending-carousel .carousel-arrow:focus-visible { opacity: 1; }');
  });
  it('draws a small 1.6em disc inside a transparent 44px hit box, 0.25em from the edges (issue #25)', () => {
    const arrow = rule('.carousel-arrow');
    expect(arrow).toMatch(/min-width:\s*44px; min-height:\s*44px/);
    expect(arrow).toMatch(/background:\s*transparent/);
    expect(arrow).toMatch(/border:\s*0/);
    expect(rule('.carousel-arrow--previous')).toMatch(/left:\s*\.25em/);
    expect(rule('.carousel-arrow--next')).toMatch(/right:\s*\.25em/);
    const disc = rule('.carousel-arrow-disc');
    expect(disc).toMatch(/width:\s*1\.6em; height:\s*1\.6em; min-width:\s*32px; min-height:\s*32px/);
    expect(disc).toMatch(/border-radius:\s*50%/);
    expect(disc).toMatch(/background:\s*var\(--card\)/);
    expect(rule('.carousel-arrow-disc svg')).toMatch(/width:\s*1em; height:\s*1em; min-width:\s*18px; min-height:\s*18px/);
    expect(rule('.carousel-arrow:active .carousel-arrow-disc')).toMatch(/background:\s*var\(--strong\)/);
    // The arrows are not .icon-button, so the card themes' bordered square look can't reach them.
    expect(css).not.toContain('.stage--card .carousel-arrow {');
    expect(rule('.carousel-arrow:active')).toMatch(/background:\s*transparent/);
  });
  it('gives each dot a 44px hit area and lets stacked slides take the taller height', () => {
    expect(rule('.carousel-dot')).toMatch(/min-width:\s*44px; min-height:\s*44px/);
    expect(rule('.stage--stacked .trending-carousel, .stage--stacked .carousel-viewport, .stage--stacked .carousel-track')).toMatch(/height:\s*auto/);
  });
});

describe('overlay stacking (issue #27)', () => {
  it('puts the settings/break overlay above every other z-index on the stage', () => {
    const overlay = Number(rule('.settings-layer').match(/z-index:\s*(-?\d+)/)?.[1]);
    expect(overlay).toBeGreaterThan(0);
    const others = [...css.replace(/(?:^|\n)\.settings-layer\s*\{[^}]*\}/, '').matchAll(/z-index:\s*(-?\d+)/g)].map(([, value]) => Number(value));
    expect(others.length).toBeGreaterThan(0);
    for (const value of others) expect(overlay).toBeGreaterThan(value);
  });
});

describe('resting break pill (issue #29)', () => {
  it('drops the dimming overlay and lets clicks through to the page, except on the pill', () => {
    const layer = rule('.break-layer--pill');
    expect(layer).toMatch(/background:\s*none/);
    expect(layer).toMatch(/pointer-events:\s*none/);
    expect(layer).toMatch(/align-items:\s*flex-start/);
    expect(rule('.break-layer--pill .break-panel--pill')).toMatch(/pointer-events:\s*auto/);
  });
  it('is frosted glass with rounded ends, from per-theme glass colours', () => {
    const pill = rule('.break-layer--pill .break-panel--pill');
    expect(pill).toMatch(/background:\s*var\(--glass\)/);
    expect(pill).toMatch(/-webkit-backdrop-filter:\s*blur\(8px\) saturate\(160%\)/);
    expect(pill).toMatch(/(^|[^-])backdrop-filter:\s*blur\(8px\) saturate\(160%\)/);
    expect(pill).toMatch(/border:\s*1px solid var\(--glass-border\)/);
    expect(pill).toMatch(/border-radius:\s*1\.4em/);
  });
  it('is see-through: glass alpha .18 in the light themes, .28 in dark (issue #31)', () => {
    const alpha = (selector) => Number(variables(block(selector))['--glass'].match(/rgba\([^)]*,\s*([\d.]+)\)/)[1]);
    expect(Number(light['--glass'].match(/rgba\([^)]*,\s*([\d.]+)\)/)[1])).toBe(0.18);
    for (const theme of ['sky', 'sage', 'lavender', 'mint']) expect(alpha(`.theme--${theme}`)).toBe(0.18);
    expect(alpha('.theme--dark')).toBe(0.28);
  });
  it('gives the pill close button no background of its own, even when pressed (issue #31)', () => {
    const close = rule('.break-layer--pill .break-panel--pill .break-close');
    expect(close).toMatch(/background:\s*transparent/);
    expect(close).toMatch(/border:\s*0/);
    expect(close).toMatch(/color:\s*var\(--accent\)/);
    const pressed = rule('.break-layer--pill .break-panel--pill .break-close:active');
    expect(pressed).toMatch(/background:\s*transparent/);
    expect(pressed).toMatch(/color:\s*var\(--accent\)/);
  });
  it('shows mm:ss at 4.2em', () => {
    expect(rule('.break-panel--pill .break-countdown, .break-panel--pill .flip-clock--break')).toMatch(/font-size:\s*4\.2em/);
  });
});

describe('glass dialogs (issue #33)', () => {
  const themes = ['sky', 'sage', 'lavender', 'mint'];
  const alpha = (value) => Number(value.match(/rgba\([^)]*,\s*([\d.]+)\)/)[1]);
  const rgb = (value) => value.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/).slice(1).map(Number);
  const hex = (value) => (value.length === 4 ? [1, 2, 3].map((i) => value[i] + value[i]) : [value.slice(1, 3), value.slice(3, 5), value.slice(5, 7)]).map((part) => parseInt(part, 16));
  const all = () => [['light', light], ['dark', variables(block('.theme--dark'))], ...themes.map((theme) => [theme, variables(block(`.theme--${theme}`))])];
  it('tints the backdrop lightly with the theme page colour instead of the near-opaque wash', () => {
    expect(rule('.settings-layer')).toMatch(/background:\s*var\(--overlay\)/);
    for (const [, vars] of all()) {
      expect(rgb(vars['--overlay'])).toEqual(hex(vars['--bg']));
      expect(alpha(vars['--overlay'])).toBeGreaterThanOrEqual(0.25);
      expect(alpha(vars['--overlay'])).toBeLessThanOrEqual(0.3);
    }
  });
  it('makes the panels thicker glass than the pill: ~60% white, ~40% smoked in dark', () => {
    const panel = rule('.settings-panel');
    expect(panel).toMatch(/background:\s*var\(--glass-panel\)/);
    expect(panel).toMatch(/-webkit-backdrop-filter:\s*blur\(\d+px\) saturate\(160%\)/);
    expect(panel).toMatch(/(^|[^-])backdrop-filter:\s*blur\(\d+px\) saturate\(160%\)/);
    expect(panel).toMatch(/border:\s*1px solid var\(--glass-border\)/);
    expect(panel).toMatch(/border-radius:\s*1\.4em/);
    expect(panel).toMatch(/box-shadow:[^;]*var\(--glass-shadow\)/);
    for (const [theme, vars] of all()) {
      if (theme === 'dark') { expect(rgb(vars['--glass-panel'])).toEqual(rgb(vars['--glass'])); expect(alpha(vars['--glass-panel'])).toBe(0.4); }
      else { expect(rgb(vars['--glass-panel'])).toEqual([255, 255, 255]); expect(alpha(vars['--glass-panel'])).toBe(0.6); }
    }
    // The card themes' small radius no longer reaches the dialogs.
    expect(css).not.toContain('.stage--card .settings-panel');
  });
  it('outlines dropdowns and the secondary button in the accent colour (35% / 55%)', () => {
    for (const [, vars] of all()) {
      expect(rgb(vars['--glass-field-line'])).toEqual(hex(vars['--accent']));
      expect(alpha(vars['--glass-field-line'])).toBe(0.35);
      expect(rgb(vars['--glass-button-line'])).toEqual(hex(vars['--accent']));
      expect(alpha(vars['--glass-button-line'])).toBe(0.55);
    }
    const select = rule('.settings-panel select');
    expect(select).toMatch(/background:\s*var\(--glass-field\)/);
    expect(select).toMatch(/border:\s*1\.25px solid var\(--glass-field-line\)/);
    expect(select).toMatch(/border-radius:\s*\.6em/);
    const secondary = rule('.break-actions button:not(.filled-button)');
    expect(secondary).toMatch(/background:\s*var\(--glass-field\)/);
    expect(secondary).toMatch(/border:\s*1\.25px solid var\(--glass-button-line\)/);
    expect(secondary).toMatch(/border-radius:\s*\.6em/);
    expect(rule('.settings-panel .filled-button')).toMatch(/border-color:\s*var\(--strong\)/);
  });
  it('gives the dialog close buttons a transparent background', () => {
    const close = rule('.settings-panel .break-close');
    expect(close).toMatch(/background:\s*transparent/);
    expect(close).toMatch(/color:\s*var\(--accent\)/);
    expect(close).toMatch(/min-width:\s*44px; min-height:\s*44px/);
  });
  it('leaves the resting pill as it was', () => {
    expect(rule('.break-layer--pill')).toMatch(/background:\s*none/);
    const pill = rule('.break-layer--pill .break-panel--pill');
    expect(pill).toMatch(/background:\s*var\(--glass\)/);
    expect(pill).toMatch(/(^|[^-])backdrop-filter:\s*blur\(8px\) saturate\(160%\)/);
    expect(pill).toMatch(/border-radius:\s*1\.4em/);
    expect(pill).toMatch(/padding:\s*\.5em 2\.8em \.85em/);
    expect(rule('.break-panel--pill .break-close')).toMatch(/top:\s*\.15em; right:\s*\.15em; width:\s*2em; height:\s*2em/);
    expect(rule('.break-layer--pill .break-panel--pill .break-close:active')).toMatch(/background:\s*transparent/);
    // The pill rule must come after the panel rule it overrides.
    expect(css.indexOf('.break-layer--pill .break-panel--pill {')).toBeGreaterThan(css.indexOf('.settings-panel {'));
  });
});

describe('carousel edge and settings fit (issue #35)', () => {
  it('hides the off-screen slide once the 400 ms slide has finished, so no subpixel column of it shows', () => {
    const slide = rule('.carousel-slide');
    expect(slide).toMatch(/visibility:\s*hidden/);
    expect(slide).toMatch(/transition:\s*visibility 0s linear 400ms/);
    const current = rule('.carousel-slide--current');
    expect(current).toMatch(/visibility:\s*visible/);
    expect(current).toMatch(/transition:\s*none/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ [^{]*\.carousel-slide[,\s][^{]*\{ transition: none; \} \}/);
  });
  it('scrolls the settings form inside an inner wrapper so a scrollbar stays inside the rounded corners', () => {
    const outer = rule('.settings-panel--form');
    expect(outer).toMatch(/overflow:\s*hidden/);
    expect(outer).toMatch(/display:\s*flex/);
    expect(outer).toMatch(/flex-direction:\s*column/);
    expect(outer).toMatch(/padding:\s*0/);
    const inner = rule('.settings-scroll');
    expect(inner).toMatch(/overflow:\s*auto/);
    expect(inner).toMatch(/min-height:\s*0/);
    // The glass itself is unchanged.
    expect(rule('.settings-panel')).toMatch(/border-radius:\s*1\.4em/);
    expect(css.indexOf('.settings-panel--form {')).toBeGreaterThan(css.indexOf('.settings-panel {'));
  });
  it('uses tighter vertical spacing so the form fits a ~900px-high viewport', () => {
    expect(rule('.settings-panel--form header')).toMatch(/padding-bottom:\s*\.7em/);
    expect(rule('.settings-fields')).toMatch(/padding-top:\s*\.6em/);
    expect(rule('.settings-fields label')).toMatch(/padding:\s*\.45em \.7em \.45em 0/);
    expect(rule('.settings-panel p')).toMatch(/margin:\s*\.5em 0/);
    expect(rule('.settings-panel--form footer')).toMatch(/margin-top:\s*\.8em/);
    // The break prompt shares .settings-panel: its header and footer spacing stay as they were.
    expect(rule('.settings-panel header')).toMatch(/padding-bottom:\s*1em/);
    expect(rule('.settings-panel footer')).toMatch(/margin-top:\s*1em/);
    expect(rule('.settings-scroll')).toMatch(/padding:\s*1\.2em 1\.8em/);
  });
});

describe('break prompt pill and slide animations (issue #37)', () => {
  const themes = ['dark', 'sky', 'sage', 'lavender', 'mint'];
  it('lays the prompt out in one row that wraps under the title when narrow', () => {
    const row = rule('.break-panel--prompt');
    expect(row).toMatch(/display:\s*flex/);
    expect(row).toMatch(/flex-wrap:\s*wrap/);
    expect(row).toMatch(/align-items:\s*center/);
    expect(rule('.break-prompt-controls')).toMatch(/display:\s*flex/);
  });
  it('draws the length chips and Maybe later as glass fields, the selected chip in the accent', () => {
    const chip = rule('.break-panel--pill .break-chip');
    expect(chip).toMatch(/background:\s*var\(--glass-field\)/);
    expect(chip).toMatch(/border:\s*1\.25px solid var\(--glass-field-line\)/);
    expect(chip).toMatch(/min-height:\s*44px/);
    const selected = rule(".break-panel--pill .break-chip[aria-pressed='true']");
    expect(selected).toMatch(/border-color:\s*var\(--accent\)/);
    expect(selected).toMatch(/background:\s*var\(--glass-chip\)/);
    for (const vars of [light, ...themes.map((theme) => variables(block(`.theme--${theme}`)))]) {
      expect(vars['--glass-chip']).toMatch(/^rgba\(/);
    }
    expect(rule('.break-actions button:not(.filled-button)')).toMatch(/background:\s*var\(--glass-field\)/);
  });
  it('slides the pills down in and up out over 250 ms', () => {
    expect(rule('.break-layer--pill .break-panel--pill')).toMatch(/animation:\s*pill-in 250ms ease-out/);
    const closing = rule('.break-layer--pill .break-panel--closing');
    expect(closing).toMatch(/animation:\s*pill-out 250ms ease-in forwards/);
    expect(closing).toMatch(/pointer-events:\s*none/);
    expect(css).toMatch(/@keyframes pill-in \{ from \{ opacity: 0; transform: translateY\(-[^)]+\); \} to \{ opacity: 1; transform: none; \} \}/);
    expect(css).toMatch(/@keyframes pill-out \{ from \{ opacity: 1; transform: none; \} to \{ opacity: 0; transform: translateY\(-[^)]+\); \} \}/);
  });
  it('shows and hides the pills instantly with reduced motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.break-layer--pill \.break-panel--pill, \.break-layer--pill \.break-panel--closing \{ animation: none; \} \}/);
  });
});

describe('prompt pill close button (issue #37)', () => {
  it('centres the ✕ vertically in the one-row pill, beating the countdown pill’s top offset', () => {
    expect(rule('.break-panel--pill.break-panel--prompt .break-close')).toMatch(/top:\s*50%; transform:\s*translateY\(-50%\)/);
  });
});

describe('prompt pill spacing (issue #37)', () => {
  it('reserves room for the 44px ✕ at any base font size, so it never covers Let’s go', () => {
    expect(rule('.break-layer--pill .break-panel--prompt')).toMatch(/padding:\s*\.5em max\(2\.8em, calc\(\.4em \+ 44px\)\) \.5em 1\.2em/);
  });
});
