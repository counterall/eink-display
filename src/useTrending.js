import { useEffect, useRef, useState } from 'react';
import { readStored, writeStored } from './model';
import { fetchTrending } from './trending';
import { isTrendingData, newerTrending, periodConfig, shouldResumeTrending, TRENDING_POLL_MS } from './trendingData';

// One list ('weekly' | 'daily'): its own cache key, hourly polling and newer-cache-wins rule.
// The carousel mounts one per slide up front, so switching never shows a loading state.
export default function useTrending(period = 'weekly') {
  const cacheKey = periodConfig(period).cacheKey;
  const [data, setData] = useState(() => {
    const cached = readStored(cacheKey);
    return isTrendingData(cached, period) ? cached : null;
  });
  const [status, setStatus] = useState('loading');
  const dataRef = useRef(data);
  useEffect(() => {
    let active = true;
    let inflight = false;
    let lastAttempt = 0;
    let failed = false;
    const load = () => {
      if (inflight) return;
      inflight = true;
      lastAttempt = Date.now();
      setStatus('loading');
      fetchTrending(period).then((incoming) => {
        const next = newerTrending(dataRef.current, incoming, period);
        dataRef.current = next;
        writeStored(cacheKey, next);
        failed = false;
        if (active) { setData(next); setStatus('ready'); }
      }).catch(() => {
        failed = true;
        if (active) setStatus('error');
      }).finally(() => { inflight = false; });
    };
    const resume = () => {
      if (shouldResumeTrending({ lastAttempt, failed, hidden: document.hidden }, Date.now())) load();
    };
    load();
    const interval = setInterval(load, TRENDING_POLL_MS);
    window.addEventListener('focus', resume);
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [period, cacheKey]);
  return { data, status };
}
