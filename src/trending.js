import { fetchJSON } from './http';
import { isTrendingData, periodConfig } from './trendingData';

export const TRENDING_TIMEOUT_MS = 15000;

export function trendingURL(now = Date.now(), period = 'weekly') {
  return `${import.meta.env.BASE_URL}data/${periodConfig(period).file}?v=${Math.floor(now / 3600000)}`;
}

export async function fetchTrending(period = 'weekly') {
  const data = await fetchJSON(trendingURL(Date.now(), period), TRENDING_TIMEOUT_MS);
  if (!isTrendingData(data, period)) throw new Error(`Invalid ${period} Trending snapshot`);
  return data;
}
