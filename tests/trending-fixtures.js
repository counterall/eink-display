import { TRENDING_PERIODS } from '../src/trendingData.js';

export function trendingData(period = 'weekly') {
  const { source, starsField } = TRENDING_PERIODS[period];
  return {
    schemaVersion: 1, source, period, generatedAt: '2026-11-06T06:17:00.000Z',
    repositories: Array.from({ length: 5 }, (_, i) => ({
      rank: i + 1, owner: 'example', name: `project-${i + 1}`, url: `https://github.com/example/project-${i + 1}`,
      description: `Description for repository ${i + 1}.`, language: 'TypeScript', stars: 10000 + i, [starsField]: (period === 'daily' ? 100 : 1000) + i,
    })),
  };
}

export function trendingHTML(count = 5, period = 'weekly') {
  const gained = (i) => (period === 'daily' ? `10${i} stars today` : `1,00${i} stars this week`);
  return `<html><body>${Array.from({ length: count }, (_, i) => `<article class="Box-row">
    <h2><a href="/example/project-${i + 1}">example / project-${i + 1}</a></h2>
    <p>A useful &amp; small <strong>project</strong> ${i + 1}.</p>
    <div class="f6"><span itemprop="programmingLanguage">TypeScript</span>
      <a href="/example/project-${i + 1}/stargazers">10,00${i}</a>
      <span class="float-sm-right">${gained(i)}</span>
    </div>
  </article>`).join('')}</body></html>`;
}
