import { fetchJSON } from './http';
import { isTrendingData } from './trendingData';

export const TRENDING_TIMEOUT_MS = 15000;

export function trendingURL(now = Date.now()) {
  return `${import.meta.env.BASE_URL}data/github-trending.json?v=${Math.floor(now / 3600000)}`;
}

export async function fetchTrending() {
  const data = await fetchJSON(trendingURL(), TRENDING_TIMEOUT_MS);
  if (!isTrendingData(data)) throw new Error('Invalid weekly Trending snapshot');
  return data;
}
