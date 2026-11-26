import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../tests/fetch-stub';
import { fetchJSON } from './http';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('fetchJSON', () => {
  it('returns the parsed body and passes an AbortSignal', async () => {
    const calls = stubFetch({ a: 1 });
    await expect(fetchJSON('/x.json', 1000)).resolves.toEqual({ a: 1 });
    expect(calls[0].url).toBe('/x.json');
    expect(calls[0].options.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0].options.signal.aborted).toBe(false);
  });
  it('aborts a request that takes longer than the timeout', async () => {
    vi.useFakeTimers();
    const calls = stubFetch(null, 200, 'hang');
    const result = fetchJSON('/slow.json', 15000);
    const settled = expect(result).rejects.toThrow('Request timeout');
    await vi.advanceTimersByTimeAsync(14999);
    expect(calls[0].options.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls[0].options.signal.aborted).toBe(true);
    await settled;
  });
  it('clears the timer once the response arrives', async () => {
    vi.useFakeTimers();
    const calls = stubFetch({});
    await fetchJSON('/x.json', 1000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls[0].options.signal.aborted).toBe(false);
  });
  it('rejects HTTP errors, network errors and invalid JSON', async () => {
    stubFetch({}, 404);
    await expect(fetchJSON('/x.json', 1000)).rejects.toThrow('HTTP 404');
    stubFetch({}, 200, 'network');
    await expect(fetchJSON('/x.json', 1000)).rejects.toThrow('Network error');
    stubFetch({}, 200, 'badJson');
    await expect(fetchJSON('/x.json', 1000)).rejects.toThrow('Invalid JSON');
  });
});
