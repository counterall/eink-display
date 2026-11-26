import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import { TrendingCarousel, TrendingContent } from './TrendingFeed';
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

describe('daily Trending slide (issue #23)', () => {
  it('uses the daily title, star wording and official daily link', () => {
    const zh = render({ period: 'daily', data: trendingData('daily') });
    expect(zh).toContain('GitHub · 今日热门');
    expect(zh).toContain('+100');
    expect(zh).toContain('今日');
    expect(zh).toContain('https://github.com/trending?since=daily');
    const en = render({ period: 'daily', data: trendingData('daily'), language: 'en' });
    expect(en).toContain('GitHub · Daily trending');
    expect(en).toContain('<small>today</small>');
  });
  it('gives each slide its own heading id', () => {
    expect(render()).toContain('id="trending-weekly-title"');
    expect(render({ period: 'daily', data: trendingData('daily') })).toContain('aria-labelledby="trending-daily-title"');
  });
  it('marks a stale daily snapshot after 48 hours like the weekly one', () => {
    expect(render({ period: 'daily', data: trendingData('daily'), now: new Date('2026-11-08T06:17:01Z') })).toContain('榜单更新可能已延迟');
    expect(render({ period: 'daily', data: trendingData('daily'), now: new Date('2026-11-08T06:16:59Z') })).not.toContain('榜单更新可能已延迟');
  });
});

describe('Trending carousel markup (issue #23)', () => {
  const slide = (s) => <TrendingContent {...props} period={s.period} data={trendingData(s.period)} footer={false} />;
  const carousel = (overrides = {}) => renderToStaticMarkup(<TrendingCarousel language="zh" city={props.city} now={props.now} interval={10} renderSlide={slide} {...overrides} />);
  it('puts both slides, weekly first, in one track with the daily slide inert and hidden', () => {
    const markup = carousel();
    expect(markup).toContain('class="carousel-track" style="transform:translateX(0%)"');
    const slides = [...markup.matchAll(/<div class="carousel-slide[^"]*"[^>]*>/g)].map((match) => match[0]);
    expect(slides).toHaveLength(2);
    expect(slides[0]).toContain('carousel-slide--current');
    expect(slides[0]).not.toContain('inert');
    expect(slides[0]).not.toContain('aria-hidden');
    expect(slides[1]).toContain('inert=""');
    expect(slides[1]).toContain('aria-hidden="true"');
    expect(markup.indexOf('GitHub · 本周热门')).toBeLessThan(markup.indexOf('GitHub · 今日热门'));
  });
  it('has one dot per slide with a spoken position and the current one marked', () => {
    const markup = carousel();
    const dots = [...markup.matchAll(/<button[^>]*class="carousel-dot"[^>]*>/g)].map((match) => match[0]);
    expect(dots).toHaveLength(2);
    expect(dots[0]).toContain('aria-label="第 1 张，共 2 张：本周热门"');
    expect(dots[0]).toContain('aria-current="true"');
    expect(dots[1]).toContain('aria-label="第 2 张，共 2 张：今日热门"');
    expect(dots[1]).not.toContain('aria-current');
    const en = carousel({ language: 'en' });
    expect(en).toContain('aria-label="Slide 1 of 2: weekly trending"');
    expect(en).toContain('aria-label="Slide 2 of 2: daily trending"');
    expect(en).toContain('aria-roledescription="carousel"');
  });
  it('has previous / next icon buttons and one footer for the current slide', () => {
    const markup = carousel({ language: 'en' });
    expect(markup).toMatch(/class="icon-button carousel-arrow carousel-arrow--previous"[^>]*aria-label="Previous slide"/);
    expect(markup).toMatch(/class="icon-button carousel-arrow carousel-arrow--next"[^>]*aria-label="Next slide"/);
    expect(markup.match(/class="trending-footer"/g)).toHaveLength(1);
    expect(markup).toContain('https://github.com/trending?since=weekly');
    expect(markup).not.toContain('https://github.com/trending?since=daily');
    expect(markup.match(/id="trending-[a-z]+-title"/g)).toEqual(['id="trending-weekly-title"', 'id="trending-daily-title"']);
  });
  it('drops arrows and dots for a single slide', () => {
    const markup = carousel({ slides: [{ id: 'weekly', period: 'weekly' }] });
    expect(markup).not.toContain('carousel-dot');
    expect(markup).not.toContain('carousel-arrow');
  });
});
