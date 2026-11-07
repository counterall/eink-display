export const TRENDING_SOURCE = 'https://github.com/trending?since=weekly';
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

export function isTrendingData(data) {
  if (!data || data.schemaVersion !== 1 || data.source !== TRENDING_SOURCE || data.period !== 'weekly'
    || typeof data.generatedAt !== 'string' || !Number.isFinite(Date.parse(data.generatedAt))
    || !Array.isArray(data.repositories) || data.repositories.length !== TRENDING_LIMIT) return false;
  const seen = new Set();
  return data.repositories.every((repo, index) => {
    if (!repo || repo.rank !== index + 1 || !repositoryURL(repo.owner, repo.name)
      || repo.url !== repositoryURL(repo.owner, repo.name) || seen.has(repo.url.toLowerCase())
      || typeof repo.description !== 'string' || repo.description.length > 600
      || !(repo.language === null || (typeof repo.language === 'string' && repo.language.length > 0 && repo.language.length <= 80))
      || !Number.isSafeInteger(repo.stars) || repo.stars < 0
      || !Number.isSafeInteger(repo.weeklyStars) || repo.weeklyStars < 0) return false;
    seen.add(repo.url.toLowerCase());
    return true;
  });
}

export function newerTrending(current, incoming) {
  if (!isTrendingData(incoming)) return isTrendingData(current) ? current : null;
  return isTrendingData(current) && Date.parse(current.generatedAt) > Date.parse(incoming.generatedAt) ? current : incoming;
}

export function formatStars(count) {
  return Number.isSafeInteger(count) && count >= 0 ? String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—';
}
