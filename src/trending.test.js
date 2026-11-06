import { afterEach, describe, expect, it, vi } from 'vitest';
import { trendingData } from '../tests/trending-fixtures';
import { fetchTrending, trendingURL } from './trending';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('same-origin Trending snapshot request', () => {
  function mock(response, status = 200, event = 'onload') {
    const requests = [];
    vi.stubGlobal('XMLHttpRequest', class {
      constructor() { requests.push(this); }
      open(method, url) { this.method = method; this.url = url; }
      send() { this.status = status; this.responseText = JSON.stringify(response); this[event](); }
    });
    return requests;
  }
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
  it('validates a successful response and sets a real timeout', async () => {
    const requests = mock(trendingData());
    await expect(fetchTrending()).resolves.toEqual(trendingData());
    expect(requests[0].timeout).toBe(15000);
  });
  it('rejects invalid snapshots, HTTP errors, network errors and timeouts', async () => {
    mock({});
    await expect(fetchTrending()).rejects.toThrow('Invalid weekly Trending snapshot');
    mock({}, 404);
    await expect(fetchTrending()).rejects.toThrow('HTTP 404');
    mock({}, 200, 'onerror');
    await expect(fetchTrending()).rejects.toThrow('Network error');
    mock({}, 200, 'ontimeout');
    await expect(fetchTrending()).rejects.toThrow('Request timeout');
  });
});
