import { useEffect, useRef, useState } from 'react';
import { CITIES, cityById, currentWeather, readStored, refreshSlot, validWeather, writeStored } from './model';
import { fetchWeather } from './weather';

export const WEATHER_CACHE_KEY = 'kindle-weather-v1';
export const WEATHER_RETRY_MS = 15 * 60000;

// Keep only well-formed entries for known cities from a stored cache.
export function loadWeatherCache(stored) {
  const valid = {};
  if (stored && typeof stored === 'object') CITIES.forEach((city) => {
    const entry = stored[city.id];
    if (entry && validWeather(entry.data) && Number.isFinite(entry.fetchedAt) && typeof entry.slot === 'string') valid[city.id] = entry;
  });
  return valid;
}

// One request per city per two-hour Helsinki slot. After a failure, back off
// instead of retrying on every clock tick, focus or visibility change.
export function shouldFetchWeather({ cached, inflight, lastFailure }, now) {
  if (inflight) return false;
  if (cached && cached.slot === refreshSlot(now) && currentWeather(cached.data)) return false;
  if (lastFailure && now.getTime() - lastFailure < WEATHER_RETRY_MS) return false;
  return true;
}

// `now` is the app's minute clock, which also advances when the page becomes
// visible or focused again, so weather checks follow the same tick.
export default function useWeather(primary, secondary, now) {
  const [entries, setEntries] = useState(() => loadWeatherCache(readStored(WEATHER_CACHE_KEY)));
  const [status, setStatus] = useState({});
  const entriesRef = useRef(entries);
  const inflight = useRef({});
  const failures = useRef({});
  const mounted = useRef(false);

  const update = (at) => {
    [primary, secondary].forEach((id) => {
      if (!shouldFetchWeather({ cached: entriesRef.current[id], inflight: inflight.current[id], lastFailure: failures.current[id] }, at)) return;
      inflight.current[id] = true;
      setStatus((old) => ({ ...old, [id]: 'loading' }));
      fetchWeather(cityById(id)).then((entry) => {
        const next = { ...entriesRef.current, [id]: entry };
        entriesRef.current = next;
        writeStored(WEATHER_CACHE_KEY, next);
        delete failures.current[id];
        if (mounted.current) { setEntries(next); setStatus((old) => ({ ...old, [id]: 'ready' })); }
      }).catch(() => {
        failures.current[id] = Date.now();
        if (mounted.current) setStatus((old) => ({ ...old, [id]: 'error' }));
      }).finally(() => { delete inflight.current[id]; });
    });
  };

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { update(now); }, [primary, secondary, now]);
  useEffect(() => {
    // Reconnecting does not advance the clock, so check separately.
    const online = () => update(new Date());
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [primary, secondary]);
  return { entries, status };
}
