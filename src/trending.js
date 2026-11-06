import { isTrendingData } from './trendingData';

export function trendingURL(now = Date.now()) {
  return `${import.meta.env.BASE_URL}data/github-trending.json?v=${Math.floor(now / 3600000)}`;
}

export function fetchTrending() {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', trendingURL(), true);
    request.timeout = 15000;
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) return reject(new Error(`HTTP ${request.status}`));
      try {
        const data = JSON.parse(request.responseText);
        if (!isTrendingData(data)) throw new Error('Invalid weekly Trending snapshot');
        resolve(data);
      } catch (error) { reject(error); }
    };
    request.onerror = () => reject(new Error('Network error'));
    request.ontimeout = () => reject(new Error('Request timeout'));
    request.send();
  });
}
