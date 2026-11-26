// GET a JSON document with a hard timeout (AbortController), so a stalled
// request cannot keep the weather or Trending status on "loading" forever.
// Errors are plain messages the hooks only use to mark a failed update.
export async function fetchJSON(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    throw new Error(error && error.name === 'AbortError' ? 'Request timeout' : 'Network error');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw new Error('Invalid JSON');
  }
}
