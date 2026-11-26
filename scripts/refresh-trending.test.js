import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseTrending, refreshAllTrending, refreshTrending } from './refresh-trending.mjs';
import { trendingData, trendingHTML } from '../tests/trending-fixtures';

const now = new Date('2026-11-06T06:17:00.000Z');
const directories = [];
async function outputFile() {
  const directory = await mkdtemp(join(tmpdir(), 'kindle-trending-test-'));
  directories.push(directory);
  return join(directory, 'github-trending.json');
}
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe('official Trending HTML parser', () => {
  it('keeps official order instead of sorting by weekly or total stars', () => {
    const data = parseTrending(trendingHTML(7), now);
    expect(data.repositories).toHaveLength(5);
    expect(data.repositories[0]).toMatchObject({ rank: 1, name: 'project-1', stars: 10000, weeklyStars: 1000, description: 'A useful & small project 1.' });
    expect(data.repositories[4].name).toBe('project-5');
    expect(data.generatedAt).toBe(now.toISOString());
  });
  it('supports empty descriptions, unspecified languages and singular star counts', () => {
    const html = trendingHTML().replace(/<p>[\s\S]*?<\/p>/g, '').replace(/<span itemprop="programmingLanguage">TypeScript<\/span>/g, '').replace('1,000 stars this week', '1 star this week');
    const repo = parseTrending(html, now).repositories[0];
    expect(repo).toMatchObject({ language: null, description: '', weeklyStars: 1 });
  });
  it('rejects empty pages, incomplete markup and the wrong date range', () => {
    expect(() => parseTrending('<html>Rate limited</html>', now)).toThrow();
    expect(() => parseTrending(trendingHTML(4), now)).toThrow();
    expect(() => parseTrending(trendingHTML().replaceAll('this week', 'this month'), now)).toThrow('Weekly star counts');
    expect(() => parseTrending(trendingHTML().replace('/example/project-1"', 'javascript:alert(1)"'), now)).toThrow('Unexpected repository link');
  });
});

describe('persistent last-successful snapshot', () => {
  it('writes a valid snapshot on success', async () => {
    const outputPath = await outputFile();
    const result = await refreshTrending({ outputPath, now, fetchImpl: async () => ({ ok: true, text: async () => trendingHTML() }) });
    expect(result.cached).toBe(false);
    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(result.data);
  });
  it.each(['network', 'rate-limit', 'markup'])('preserves the file and its original timestamp on %s failure', async (failure) => {
    const outputPath = await outputFile();
    const original = `${JSON.stringify(trendingData())}\n`;
    await writeFile(outputPath, original);
    const fetchImpl = async () => {
      if (failure === 'network') throw new Error('offline');
      if (failure === 'rate-limit') return { ok: false, status: 429 };
      return { ok: true, text: async () => '<html>Changed layout</html>' };
    };
    const result = await refreshTrending({ outputPath, now: new Date('2026-11-07T06:17:00Z'), fetchImpl });
    expect(result.cached).toBe(true);
    expect(result.data.generatedAt).toBe(trendingData().generatedAt);
    expect(await readFile(outputPath, 'utf8')).toBe(original);
  });
  it('fails visibly when neither the source nor a valid snapshot is available', async () => {
    const outputPath = await outputFile();
    await expect(refreshTrending({ outputPath, fetchImpl: async () => ({ ok: false, status: 403 }) })).rejects.toThrow('HTTP 403');
    await writeFile(outputPath, '{invalid JSON');
    await expect(refreshTrending({ outputPath, fetchImpl: async () => ({ ok: false, status: 429 }) })).rejects.toThrow('HTTP 429');
  });
});

describe('daily Trending list (issue #23)', () => {
  it('parses "N stars today" into dailyStars with the daily source and period', () => {
    const data = parseTrending(trendingHTML(7, 'daily'), now, 'daily');
    expect(data).toMatchObject({ period: 'daily', source: 'https://github.com/trending?since=daily' });
    expect(data.repositories).toHaveLength(5);
    expect(data.repositories[0]).toMatchObject({ rank: 1, name: 'project-1', stars: 10000, dailyStars: 100 });
    expect(data.repositories[0]).not.toHaveProperty('weeklyStars');
    expect(parseTrending(trendingHTML(5, 'daily').replace('100 stars today', '1 star today'), now, 'daily').repositories[0].dailyStars).toBe(1);
  });
  it('rejects weekly markup on the daily page and vice versa', () => {
    expect(() => parseTrending(trendingHTML(5, 'weekly'), now, 'daily')).toThrow('Daily star counts');
    expect(() => parseTrending(trendingHTML(5, 'daily'), now, 'weekly')).toThrow('Weekly star counts');
  });
  it('fetches the daily page for the daily list', async () => {
    const outputPath = await outputFile();
    const urls = [];
    const result = await refreshTrending({ period: 'daily', outputPath, now, fetchImpl: async (url) => { urls.push(url); return { ok: true, text: async () => trendingHTML(5, 'daily') }; } });
    expect(urls).toEqual(['https://github.com/trending?since=daily']);
    expect(JSON.parse(await readFile(outputPath, 'utf8'))).toEqual(result.data);
  });
});

describe('refreshing both lists independently (issue #23)', () => {
  const pages = (failing) => async (url) => {
    const period = url.endsWith('daily') ? 'daily' : 'weekly';
    if (period === failing) return { ok: false, status: 429 };
    return { ok: true, text: async () => trendingHTML(5, period) };
  };
  async function directoryWith(files) {
    const directory = dirname(await outputFile());
    for (const [name, value] of Object.entries(files)) await writeFile(join(directory, name), `${JSON.stringify(value)}\n`);
    return directory;
  }
  it('writes both files to their own names', async () => {
    const directory = await directoryWith({});
    const results = await refreshAllTrending({ directory, now, fetchImpl: pages(null) });
    expect(results.weekly.cached).toBe(false);
    expect(results.daily.cached).toBe(false);
    expect(JSON.parse(await readFile(join(directory, 'github-trending.json'), 'utf8')).period).toBe('weekly');
    expect(JSON.parse(await readFile(join(directory, 'github-trending-daily.json'), 'utf8')).period).toBe('daily');
  });
  it.each(['weekly', 'daily'])('still updates the other list when %s fails, keeping its last good file', async (failing) => {
    const old = { 'github-trending.json': trendingData('weekly'), 'github-trending-daily.json': trendingData('daily') };
    const directory = await directoryWith(old);
    const later = new Date('2026-11-07T06:17:00Z');
    const results = await refreshAllTrending({ directory, now: later, fetchImpl: pages(failing) });
    const other = failing === 'weekly' ? 'daily' : 'weekly';
    expect(results[failing]).toMatchObject({ cached: true });
    expect(results[other]).toMatchObject({ cached: false });
    const file = (period) => join(directory, period === 'daily' ? 'github-trending-daily.json' : 'github-trending.json');
    expect(await readFile(file(failing), 'utf8')).toBe(`${JSON.stringify(trendingData(failing))}\n`);
    expect(JSON.parse(await readFile(file(other), 'utf8')).generatedAt).toBe(later.toISOString());
  });
  it('reports a list with no snapshot as failed without stopping the other', async () => {
    const directory = await directoryWith({});
    const results = await refreshAllTrending({ directory, now, fetchImpl: pages('daily') });
    expect(results.daily).toMatchObject({ failed: true, error: 'GitHub returned HTTP 429' });
    expect(results.weekly.cached).toBe(false);
  });
});
