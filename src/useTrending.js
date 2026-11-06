import { useEffect, useRef, useState } from 'react';
import { readStored, writeStored } from './model';
import { fetchTrending } from './trending';
import { isTrendingData, newerTrending, TRENDING_POLL_MS } from './trendingData';

const CACHE_KEY = 'kindle-trending-weekly-v1';

export default function useTrending() {
  const [data, setData] = useState(() => {
    const cached = readStored(CACHE_KEY);
    return isTrendingData(cached) ? cached : null;
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
      fetchTrending().then((incoming) => {
        const next = newerTrending(dataRef.current, incoming);
        dataRef.current = next;
        writeStored(CACHE_KEY, next);
        failed = false;
        if (active) { setData(next); setStatus('ready'); }
      }).catch(() => {
        failed = true;
        if (active) setStatus('error');
      }).finally(() => { inflight = false; });
    };
    const resume = () => {
      const age = Date.now() - lastAttempt;
      if (!document.hidden && (age >= TRENDING_POLL_MS || (failed && age >= 5 * 60000))) load();
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
  }, []);
  return { data, status };
}
