import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// Calling Settings as a plain function (no DOM here) needs hooks that work outside a render.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
  };
});

const { default: Settings } = await import('./Settings');
const { APP_TEXT } = await import('./i18n');
const { normalizeSettings } = await import('./model');
const { viewportLayout } = await import('./layout');

const props = (close, language = 'en') => ({ settings: normalizeSettings({ language }), setSettings: () => {}, close, viewport: viewportLayout(1448, 1072), t: APP_TEXT[language] });
const findAll = (node, test, found = []) => {
  if (Array.isArray(node)) { node.forEach((child) => findAll(child, test, found)); return found; }
  if (!node || typeof node !== 'object') return found;
  if (test(node)) found.push(node);
  if (node.props) findAll(node.props.children, test, found);
  return found;
};

describe("settings scroll wrapper (issue #35)", () => {
  beforeEach(() => vi.stubGlobal("window", { innerWidth: 1448, innerHeight: 1072, devicePixelRatio: 1 }));
  afterEach(() => vi.unstubAllGlobals());
  it("wraps the whole form in .settings-scroll inside the glass panel", () => {
    const markup = renderToStaticMarkup(<Settings {...props(() => {})} />);
    expect(markup).toMatch(/<section class="settings-panel settings-panel--form"[^>]*><div class="settings-scroll"><header>/);
    expect(markup).toMatch(/<\/footer><\/div><\/section>/);
  });
});

describe('settings close button (issue #33)', () => {
  beforeEach(() => vi.stubGlobal('window', { innerWidth: 1448, innerHeight: 1072, devicePixelRatio: 1 }));
  afterEach(() => vi.unstubAllGlobals());
  it('has a ✕ in the header, labelled with the localized close text', () => {
    for (const language of ['zh', 'en']) {
      const markup = renderToStaticMarkup(<Settings {...props(() => {}, language)} />);
      const header = markup.match(/<header>([\s\S]*?)<\/header>/)[1];
      expect(header).toContain(`<button type="button" class="break-close settings-close" aria-label="${APP_TEXT[language].closeDialog}" title="${APP_TEXT[language].closeDialog}">`);
      expect(header).toContain('<svg');
    }
  });
  it('comes before the fields, so it is the first stop in the focus trap', () => {
    const markup = renderToStaticMarkup(<Settings {...props(() => {})} />);
    expect(markup.indexOf('settings-close')).toBeLessThan(markup.indexOf('<select'));
  });
  it('closes exactly like Done', () => {
    const close = vi.fn();
    const tree = Settings(props(close));
    const [cross] = findAll(tree, (node) => node.type === 'button' && /settings-close/.test(node.props.className || ''));
    const [done] = findAll(tree, (node) => node.type === 'button' && node.props.className === 'filled-button');
    expect(cross.props.onClick).toBe(done.props.onClick);
    cross.props.onClick();
    expect(close).toHaveBeenCalledWith({ breakNow: false });
  });
});
