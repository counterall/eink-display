// One entry per Trending list (issue #23). Each has its own official source page, its own
// committed snapshot under public/data/, its own browser cache key and the name of the
// "stars gained in this period" field in that snapshot.
export const TRENDING_PERIODS = {
  weekly: {
    source: 'https://github.com/trending?since=weekly',
    file: 'github-trending.json',
    cacheKey: 'kindle-trending-weekly-v1',
    starsField: 'weeklyStars',
    starsText: /^([\d,]+)\s+stars?\s+this\s+week$/i,
  },
  daily: {
    source: 'https://github.com/trending?since=daily',
    file: 'github-trending-daily.json',
    cacheKey: 'kindle-trending-daily-v1',
    starsField: 'dailyStars',
    starsText: /^([\d,]+)\s+stars?\s+today$/i,
  },
};
export const TRENDING_PERIOD_NAMES = Object.keys(TRENDING_PERIODS);
export const periodConfig = (period) => TRENDING_PERIODS[period] || TRENDING_PERIODS.weekly;
export const TRENDING_SOURCE = TRENDING_PERIODS.weekly.source;
export const TRENDING_LIMIT = 5;
export const TRENDING_POLL_MS = 60 * 60 * 1000;
export const TRENDING_STALE_MS = 48 * 60 * 60 * 1000;
export const TRENDING_RETRY_MS = 5 * 60 * 1000;

// On focus / visibility / reconnect: catch up a missed hourly check, or retry
// sooner after a failure, without refetching on every wake-up.
export function shouldResumeTrending({ lastAttempt, failed, hidden }, nowMs) {
  if (hidden) return false;
  const age = nowMs - lastAttempt;
  return age >= TRENDING_POLL_MS || (failed && age >= TRENDING_RETRY_MS);
}

export function repositoryURL(owner, name) {
  if (typeof owner !== 'string' || typeof name !== 'string'
    || !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner)
    || !/^[a-zA-Z0-9._-]{1,100}$/.test(name) || name === '.' || name === '..') return null;
  return `https://github.com/${owner}/${name}`;
}

export function isTrendingData(data, period = 'weekly') {
  const config = TRENDING_PERIODS[period];
  if (!config || !data || data.schemaVersion !== 1 || data.source !== config.source || data.period !== period
    || typeof data.generatedAt !== 'string' || !Number.isFinite(Date.parse(data.generatedAt))
    || !Array.isArray(data.repositories) || data.repositories.length !== TRENDING_LIMIT) return false;
  const seen = new Set();
  return data.repositories.every((repo, index) => {
    if (!repo || repo.rank !== index + 1 || !repositoryURL(repo.owner, repo.name)
      || repo.url !== repositoryURL(repo.owner, repo.name) || seen.has(repo.url.toLowerCase())
      || typeof repo.description !== 'string' || repo.description.length > 600
      || !(repo.language === null || (typeof repo.language === 'string' && repo.language.length > 0 && repo.language.length <= 80))
      || !Number.isSafeInteger(repo.stars) || repo.stars < 0
      || !Number.isSafeInteger(repo[config.starsField]) || repo[config.starsField] < 0) return false;
    seen.add(repo.url.toLowerCase());
    return true;
  });
}

// Stars gained in the list's period (weekly → weeklyStars, daily → dailyStars).
export const periodStars = (repo, period = 'weekly') => repo[periodConfig(period).starsField];

export function newerTrending(current, incoming, period = 'weekly') {
  if (!isTrendingData(incoming, period)) return isTrendingData(current, period) ? current : null;
  return isTrendingData(current, period) && Date.parse(current.generatedAt) > Date.parse(incoming.generatedAt) ? current : incoming;
}

export function formatStars(count) {
  return Number.isSafeInteger(count) && count >= 0 ? String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';
}
