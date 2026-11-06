import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import { TrendingContent } from './TrendingFeed';
import { trendingData } from '../tests/trending-fixtures';

const props = { data: trendingData(), status: 'ready', language: 'zh', city: cityById('helsinki'), now: new Date('2026-11-06T12:00Z') };
const render = (overrides = {}) => renderToStaticMarkup(<TrendingContent {...props} {...overrides} />);

describe('weekly Trending panel', () => {
  it('renders five ranked repositories, descriptions, languages and weekly star gains', () => {
    const markup = render();
    expect(markup.match(/class="trending-item"/g)).toHaveLength(5);
    expect(markup).toContain('example / project-1');
    expect(markup).toContain('Description for repository 1.');
    expect(markup).toContain('+1,000');
    expect(markup).toContain('TypeScript');
    expect(markup).toContain('本周');
    expect(markup).toContain('https://github.com/trending?since=weekly');
  });
  it('localizes the interface and displays snapshot time in the primary city timezone', () => {
    const markup = render({ language: 'en' });
    expect(markup).toContain('GitHub · Weekly trending');
    expect(markup).toContain('2026-11-06');
    expect(markup).toContain('08:17');
  });
  it('keeps all cached rows when the request fails', () => {
    const markup = render({ status: 'error' });
    expect(markup.match(/class="trending-item"/g)).toHaveLength(5);
    expect(markup).toContain('保留上次榜单');
  });
  it('marks old snapshots without presenting them as newly fetched data', () => {
    const markup = render({ now: new Date('2026-11-09T12:00Z') });
    expect(markup).toContain('榜单更新可能已延迟');
    expect(markup).toContain('2026-11-06');
  });
  it('shows loading and unavailable states without inventing entries', () => {
    expect(render({ data: null, status: 'loading' })).toContain('正在读取榜单');
    const markup = render({ data: null, status: 'error' });
    expect(markup).toContain('暂时无法读取榜单');
    expect(markup).not.toContain('trending-item');
  });
  it('escapes descriptions as text instead of executing repository-provided HTML', () => {
    const data = trendingData();
    data.repositories[0].description = '<script>alert(1)</script>';
    const markup = render({ data });
    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&lt;script&gt;');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});
