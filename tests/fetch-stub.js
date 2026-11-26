import { vi } from 'vitest';

// Replaces global fetch. `mode`: 'ok' answers with `body` and `status`, 'network' fails like an
// offline browser, 'hang' never answers until the request's AbortSignal fires, 'badJson' has an
// unparseable body. Returns the list of calls ({ url, options }).
export function stubFetch(body, status = 200, mode = 'ok') {
  const calls = [];
  vi.stubGlobal('fetch', (url, options) => {
    calls.push({ url, options });
    if (mode === 'network') return Promise.reject(new TypeError('Failed to fetch'));
    if (mode === 'hang') {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
      });
    }
    const json = mode === 'badJson' ? () => Promise.reject(new SyntaxError('Unexpected token')) : () => Promise.resolve(body);
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json });
  });
  return calls;
}
