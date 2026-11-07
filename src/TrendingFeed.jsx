import { Star } from 'lucide-react';
import { cityDate, clock, dateKey } from './model';
import { formatStars, TRENDING_SOURCE, TRENDING_STALE_MS } from './trendingData';
import useTrending from './useTrending';
import { TRENDING_TEXT, pick } from './i18n';

export function TrendingContent({ data, status, language, city, now }) {
  const t = pick(TRENDING_TEXT, language);
  const fetched = data ? cityDate(city, new Date(data.generatedAt)) : null;
  const stale = data && now.getTime() - Date.parse(data.generatedAt) > TRENDING_STALE_MS;
  return <section className="trending-feed" aria-labelledby="trending-title">
    <header className="trending-header">
      <h2 id="trending-title">{t.title}</h2>
      <div className="trending-status" aria-live="polite">
        {fetched ? <span>{t.updated} {dateKey(fetched)} {clock(fetched, '24').digits}</span> : <span>{status === 'error' ? t.failed : t.loading}</span>}
        {data && (status === 'error' || stale) && <strong>{status === 'error' ? t.cached : t.stale}</strong>}
      </div>
    </header>
    {data && <ol className="trending-list" role="list">{data.repositories.map((repo) =>
      <li className="trending-item" key={repo.url}>
        <h3 className="repo-heading"><span className="repo-rank" aria-hidden="true">{String(repo.rank).padStart(2, '0')}</span><a className="repo-link" href={repo.url} target="_blank" rel="noopener noreferrer" title={`${repo.owner} / ${repo.name}`}>{repo.owner} / {repo.name}</a></h3>
        <p className="repo-description" title={repo.description || t.description}>{repo.description || t.description}</p>
        <div className="repo-meta"><span className="repo-language">{repo.language || t.language}</span><span className="repo-stars"><Star aria-hidden="true" strokeWidth={1.8} /><span>+{formatStars(repo.weeklyStars)}</span><small>{t.week}</small></span></div>
      </li>
    )}</ol>}
    <footer className="trending-footer"><span>{t.note}</span><a href={TRENDING_SOURCE} target="_blank" rel="noopener noreferrer">{t.source}</a></footer>
  </section>;
}

export default function TrendingFeed(props) {
  const { data, status } = useTrending();
  return <TrendingContent {...props} data={data} status={status} />;
}
