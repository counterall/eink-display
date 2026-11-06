import { load } from 'cheerio';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTrendingData, repositoryURL, TRENDING_LIMIT, TRENDING_SOURCE } from '../src/trendingData.js';

export const DEFAULT_OUTPUT = fileURLToPath(new URL('../public/data/github-trending.json', import.meta.url));
const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

function parseCount(text) {
  const value = cleanText(text).replace(/,/g, '');
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Unrecognized star count: ${text}`);
  return Number(value);
}

export function parseTrending(html, now = new Date()) {
  const $ = load(html);
  const repositories = [];
  for (const element of $('article.Box-row').toArray()) {
    if (repositories.length === TRENDING_LIMIT) break;
    const article = $(element);
    const href = article.find('h2 a').first().attr('href');
    if (!href) continue;
    const path = /^\/([^/]+)\/([^/]+)\/?$/.exec(href);
    if (!path || !repositoryURL(path[1], path[2])) throw new Error('Unexpected repository link in Trending HTML');
    const [, owner, name] = path;
    const weeklyText = cleanText(article.find('.float-sm-right').last().text());
    const weekly = /^([\d,]+)\s+stars?\s+this\s+week$/i.exec(weeklyText);
    if (!weekly) throw new Error('Weekly star counts are missing; the source markup may have changed');
    repositories.push({
      rank: repositories.length + 1,
      owner, name, url: repositoryURL(owner, name),
      description: cleanText(article.children('p').first().text()).slice(0, 600),
      language: cleanText(article.find('[itemprop="programmingLanguage"]').first().text()) || null,
      stars: parseCount(article.find(`a[href="/${owner}/${name}/stargazers"]`).first().text()),
      weeklyStars: parseCount(weekly[1]),
    });
  }
  const data = { schemaVersion: 1, source: TRENDING_SOURCE, period: 'weekly', generatedAt: now.toISOString(), repositories };
  if (!isTrendingData(data)) throw new Error(`Expected ${TRENDING_LIMIT} distinct, complete weekly repositories`);
  return data;
}

export async function refreshTrending({ outputPath = DEFAULT_OUTPUT, fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  let cached = null;
  try {
    const candidate = JSON.parse(await readFile(outputPath, 'utf8'));
    if (isTrendingData(candidate)) cached = candidate;
  } catch { /* The first run may not have a snapshot yet. */ }

  try {
    const response = await fetchImpl(TRENDING_SOURCE, {
      headers: { Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'KindleDisplayTrending/1.0 (+https://github.com/trending)' },
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
    const data = parseTrending(await response.text(), now);
    await mkdir(dirname(outputPath), { recursive: true });
    const temporary = `${outputPath}.tmp-${process.pid}`;
    try {
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await rename(temporary, outputPath);
    } finally {
      await rm(temporary, { force: true });
    }
    return { data, cached: false };
  } catch (error) {
    if (!cached) throw error;
    // Do not change generatedAt, or overwrite the last good file on failure.
    return { data: cached, cached: true, error: error.message };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await refreshTrending();
    if (result.cached) {
      const message = `Trending refresh failed: ${result.error}. Keeping snapshot from ${result.data.generatedAt}.`;
      console.warn(message);
      if (process.env.GITHUB_ACTIONS === 'true') console.log(`::warning::${message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')}`);
    } else console.log(`Saved weekly Top ${result.data.repositories.length} to ${DEFAULT_OUTPUT} (${result.data.generatedAt}).`);
  } catch (error) {
    console.error(`Cannot generate Trending data and no valid cached snapshot exists: ${error.message}`);
    process.exitCode = 1;
  }
}
