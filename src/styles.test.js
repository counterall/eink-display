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
