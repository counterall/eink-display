import { describe, expect, it } from 'vitest';
import { trendingData } from '../tests/trending-fixtures';
import { formatStars, isTrendingData, newerTrending, repositoryURL } from './trendingData';

describe('Trending snapshot validation', () => {
  it('accepts the exact five-repository weekly schema', () => {
    expect(isTrendingData(trendingData())).toBe(true);
  });
  it('rejects empty or incomplete lists, dates and wrong periods', () => {
    const data = trendingData();
    expect(isTrendingData({ ...data, repositories: [] })).toBe(false);
    expect(isTrendingData({ ...data, repositories: data.repositories.slice(0, 4) })).toBe(false);
    expect(isTrendingData({ ...data, generatedAt: 'not-a-date' })).toBe(false);
    expect(isTrendingData({ ...data, period: 'monthly' })).toBe(false);
    expect(isTrendingData({ ...data, schemaVersion: 9 })).toBe(false);
  });
  it('rejects duplicate projects, reordered ranks, negative counts and external links', () => {
    for (const change of [
      { ...trendingData().repositories[0], rank: 2 },
      { ...trendingData().repositories[0], weeklyStars: -1 },
      { ...trendingData().repositories[0], stars: NaN },
      { ...trendingData().repositories[0], url: 'javascript:alert(1)' },
      { ...trendingData().repositories[0], url: 'https://example.com/owner/repo' },
    ]) {
      const data = trendingData();
      data.repositories[0] = change;
      expect(isTrendingData(data)).toBe(false);
    }
    const duplicate = trendingData();
    duplicate.repositories[1] = { ...duplicate.repositories[0], rank: 2 };
    expect(isTrendingData(duplicate)).toBe(false);
    duplicate.repositories[1] = { ...duplicate.repositories[0], rank: 2, owner: 'EXAMPLE', name: 'PROJECT-1', url: 'https://github.com/EXAMPLE/PROJECT-1' };
    expect(isTrendingData(duplicate)).toBe(false);
  });
  it('allows missing descriptions and languages without inventing their values', () => {
    const data = trendingData();
    data.repositories[0].description = '';
    data.repositories[0].language = null;
    expect(isTrendingData(data)).toBe(true);
  });
  it('only constructs safe GitHub repository URLs', () => {
    expect(repositoryURL('github', '.github')).toBe('https://github.com/github/.github');
    expect(repositoryURL('owner', '../secret')).toBeNull();
    expect(repositoryURL('owner', '..')).toBeNull();
    expect(repositoryURL('evil.com/path', 'repo')).toBeNull();
  });
  it('does not replace a newer browser cache with an older deployed file', () => {
    const current = trendingData();
    const older = { ...current, generatedAt: '2026-11-05T06:17:00.000Z' };
    expect(newerTrending(current, older)).toBe(current);
    expect(newerTrending(older, current)).toBe(current);
    expect(newerTrending(current, {})).toBe(current);
    expect(newerTrending(null, current)).toBe(current);
  });
  it('formats counts without depending on Intl', () => {
    expect(formatStars(0)).toBe('0');
    expect(formatStars(12345)).toBe('12,345');
    expect(formatStars(null)).toBe('—');
  });
});
