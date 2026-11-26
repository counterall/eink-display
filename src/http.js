// GET a JSON document with a hard timeout (AbortController) covering the whole request, body
// included, so a stalled request cannot keep the weather or Trending status on "loading" forever.
// Errors are plain messages the hooks only use to mark a failed update.
export async function fetchJSON(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const timedOut = (error) => controller.signal.aborted || (error && error.name === 'AbortError');
  try {
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      throw new Error(timedOut(error) ? 'Request timeout' : 'Network error');
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    try {
      return await response.json();
    } catch (error) {
      throw new Error(timedOut(error) ? 'Request timeout' : 'Invalid JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}
