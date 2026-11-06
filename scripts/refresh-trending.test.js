import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseTrending, refreshTrending } from './refresh-trending.mjs';
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
