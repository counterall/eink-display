import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowRightLeft, Settings } from 'lucide-react';
import IconButton from './IconButton';

describe('icon-only buttons', () => {
  it.each([
    [ArrowRightLeft, '交换城市'], [Settings, '设置'],
    [ArrowRightLeft, 'Swap cities'], [Settings, 'Settings'],
  ])('keeps a localized accessible name and tooltip for %s / %s', (Icon, label) => {
    const markup = renderToStaticMarkup(<IconButton icon={Icon} label={label} onClick={() => {}} />);
    expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain(`title="${label}"`);
    expect(markup).toContain('class="icon-button"');
    expect(markup).toContain('<svg');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain(`>${label}<`);
    expect(markup).not.toContain('disabled');
  });
  it('disables an action and exposes its busy state without animation', () => {
    const markup = renderToStaticMarkup(<IconButton icon={Settings} label="处理中…" busy onClick={() => {}} />);
    expect(markup).toContain('disabled');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain('animate');
  });
});
