import { afterEach, describe, expect, it, vi } from 'vitest';
import { trendingData } from '../tests/trending-fixtures';
import { stubFetch } from '../tests/fetch-stub';
import { TRENDING_TIMEOUT_MS, fetchTrending, trendingURL } from './trending';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('same-origin Trending snapshot request', () => {
  it('uses the Pages subpath, not github.com or a CORS proxy', () => {
    vi.stubEnv('BASE_URL', './');
    const url = new URL(trendingURL(7200000), 'https://example.github.io/kindle-display/');
    expect(url.origin).toBe('https://example.github.io');
    expect(url.pathname).toBe('/kindle-display/data/github-trending.json');
    expect(url.searchParams.get('v')).toBe('2');
  });
  it('also supports an explicitly configured Pages base path', () => {
    vi.stubEnv('BASE_URL', '/eink-display/');
    expect(trendingURL(0)).toBe('/eink-display/data/github-trending.json?v=0');
  });
  it('validates a successful response and requests it with a timeout signal', async () => {
    vi.stubEnv('BASE_URL', './');
    const calls = stubFetch(trendingData());
    await expect(fetchTrending()).resolves.toEqual(trendingData());
    expect(calls[0].url).toMatch(/^\.\/data\/github-trending\.json\?v=\d+$/);
    expect(calls[0].options.signal).toBeInstanceOf(AbortSignal);
    expect(TRENDING_TIMEOUT_MS).toBe(15000);
  });
  it('rejects invalid snapshots, HTTP errors, network errors and timeouts', async () => {
    stubFetch({});
    await expect(fetchTrending()).rejects.toThrow('Invalid weekly Trending snapshot');
    stubFetch({}, 404);
    await expect(fetchTrending()).rejects.toThrow('HTTP 404');
    stubFetch({}, 200, 'network');
    await expect(fetchTrending()).rejects.toThrow('Network error');
    vi.useFakeTimers();
    stubFetch({}, 200, 'hang');
    const slow = expect(fetchTrending()).rejects.toThrow('Request timeout');
    await vi.advanceTimersByTimeAsync(TRENDING_TIMEOUT_MS);
    await slow;
  });
});
