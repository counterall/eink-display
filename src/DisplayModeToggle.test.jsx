import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import DisplayModeToggle from './DisplayModeToggle';

describe('display mode toggle', () => {
  it.each([
    ['zh', 'light', '深色模式', '切换为深色模式', 'lucide-moon', false],
    ['zh', 'dark', '深色模式', '切换为浅色模式', 'lucide-sun', true],
    ['en', 'light', 'Dark mode', 'Switch to dark mode', 'lucide-moon', false],
    ['en', 'dark', 'Dark mode', 'Switch to light mode', 'lucide-sun', true],
  ])('renders %s / %s with the right icon and accessible state', (language, theme, label, title, icon, pressed) => {
    const markup = renderToStaticMarkup(<DisplayModeToggle theme={theme} language={language} onToggle={() => {}} />);
    expect(markup).toContain('class="theme-toggle"');
    expect(markup).toContain(`aria-label="${label}"`);
    expect(markup).toContain(`title="${title}"`);
    expect(markup).toContain(`aria-pressed="${pressed}"`);
    expect(markup).toContain(icon);
    expect(markup).not.toContain(`>${title}<`);
  });
});
