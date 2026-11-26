import { load } from 'cheerio';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTrendingData, repositoryURL, TRENDING_LIMIT, TRENDING_PERIOD_NAMES, TRENDING_PERIODS } from '../src/trendingData.js';

export const DEFAULT_DIRECTORY = fileURLToPath(new URL('../public/data/', import.meta.url));
export const DEFAULT_OUTPUT = join(DEFAULT_DIRECTORY, TRENDING_PERIODS.weekly.file);
const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

function parseCount(text) {
  const value = cleanText(text).replace(/,/g, '');
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Unrecognized star count: ${text}`);
  return Number(value);
}

export function parseTrending(html, now = new Date(), period = 'weekly') {
  const config = TRENDING_PERIODS[period];
  if (!config) throw new Error(`Unknown Trending period: ${period}`);
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
    const gained = config.starsText.exec(cleanText(article.find('.float-sm-right').last().text()));
    if (!gained) throw new Error(`${period === 'daily' ? 'Daily' : 'Weekly'} star counts are missing; the source markup may have changed`);
    repositories.push({
      rank: repositories.length + 1,
      owner, name, url: repositoryURL(owner, name),
      description: cleanText(article.children('p').first().text()).slice(0, 600),
      language: cleanText(article.find('[itemprop="programmingLanguage"]').first().text()) || null,
      stars: parseCount(article.find(`a[href="/${owner}/${name}/stargazers"]`).first().text()),
      [config.starsField]: parseCount(gained[1]),
    });
  }
  const data = { schemaVersion: 1, source: config.source, period, generatedAt: now.toISOString(), repositories };
  if (!isTrendingData(data, period)) throw new Error(`Expected ${TRENDING_LIMIT} distinct, complete ${period} repositories`);
  return data;
}

// Scrapes one list and atomically replaces its snapshot. On any failure the last good file is
// kept untouched (same generatedAt); with no valid snapshot to fall back on, it throws.
export async function refreshTrending({ period = 'weekly', outputPath = join(DEFAULT_DIRECTORY, TRENDING_PERIODS[period].file), fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  let cached = null;
  try {
    const candidate = JSON.parse(await readFile(outputPath, 'utf8'));
    if (isTrendingData(candidate, period)) cached = candidate;
  } catch { /* The first run may not have a snapshot yet. */ }

  try {
    const response = await fetchImpl(TRENDING_PERIODS[period].source, {
      headers: { Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'KindleDisplayTrending/1.0 (+https://github.com/trending)' },
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
    const data = parseTrending(await response.text(), now, period);
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

// Every list is refreshed on its own: one failing never stops or rolls back the others.
// Each result is the refreshTrending result, or { failed: true, error } when the list has
// neither fresh data nor a valid snapshot.
export async function refreshAllTrending({ directory = DEFAULT_DIRECTORY, fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  const results = {};
  for (const period of TRENDING_PERIOD_NAMES) {
    const outputPath = join(directory, TRENDING_PERIODS[period].file);
    try {
      results[period] = { ...(await refreshTrending({ period, outputPath, fetchImpl, now })), outputPath };
    } catch (error) {
      results[period] = { failed: true, error: error.message, outputPath };
    }
  }
  return results;
}

const annotate = (message) => message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = await refreshAllTrending();
  for (const [period, result] of Object.entries(results)) {
    if (result.failed) {
      console.error(`Cannot generate ${period} Trending data and no valid cached snapshot exists: ${result.error}`);
      process.exitCode = 1;
    } else if (result.cached) {
      const message = `${period} Trending refresh failed: ${result.error}. Keeping snapshot from ${result.data.generatedAt}.`;
      console.warn(message);
      if (process.env.GITHUB_ACTIONS === 'true') console.log(`::warning::${annotate(message)}`);
    } else console.log(`Saved ${period} Top ${result.data.repositories.length} to ${result.outputPath} (${result.data.generatedAt}).`);
  }
}
