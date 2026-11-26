import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Plain-text checks so no YAML parser is needed as a dependency.
const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
// Fail loudly (rather than checking a looser slice) if the file layout changes.
function between(text, start, end) {
  const from = text.indexOf(start), to = text.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`deploy.yml layout changed: expected ${JSON.stringify(start)} before ${JSON.stringify(end)}`);
  return text.slice(from, to);
}
const triggers = between(workflow, '\non:\n', '\npermissions:');
const push = between(triggers, '  push:', '  workflow_dispatch:');

describe('deploy workflow triggers', () => {
  it('skips pushes (and merged PRs) that only change Markdown files', () => {
    expect(push).toMatch(/paths-ignore:\s*\n\s*- '\*\*\.md'/);
  });
  it('keeps the branch list, manual runs and the daily Trending refresh', () => {
    expect(push).toContain('branches: [main, top-feeds, fullscreen-time]');
    expect(triggers).toContain('  workflow_dispatch:');
    expect(triggers).toContain("- cron: '17 6 * * *'");
  });
});

describe('deploy workflow build steps', () => {
  const build = between(workflow, '  build:', '  persist:');
  it('runs install, Trending refresh, tests, CSS lint and build in that order', () => {
    const steps = [...build.matchAll(/- run: (.+)/g)].map((match) => match[1].trim());
    expect(steps).toEqual(['pnpm install --frozen-lockfile', 'pnpm refresh:trending', 'pnpm test', 'pnpm lint:css', 'pnpm build']);
  });
  it('no longer runs the removed legacy-syntax check (issue #21)', () => {
    expect(workflow).not.toContain('check:legacy');
  });
});

describe('deploy workflow Trending snapshots (issue #23)', () => {
  const build = between(workflow, '  build:', '  persist:');
  const persist = between(workflow, '  persist:', '  deploy:');
  it('uploads both the weekly and the daily snapshot from the build job', () => {
    expect(build).toContain('public/data/github-trending.json');
    expect(build).toContain('public/data/github-trending-daily.json');
  });
  it('commits both files on main with the renamed bot message', () => {
    expect(persist).toContain('cp snapshot/github-trending.json public/data/github-trending.json');
    expect(persist).toContain('cp snapshot/github-trending-daily.json public/data/github-trending-daily.json');
    expect(persist).toContain('git add public/data/github-trending.json public/data/github-trending-daily.json');
    expect(persist).toContain("commit -m 'chore: refresh Trending snapshots'");
    expect(workflow).not.toContain('refresh weekly Trending snapshot');
  });
});
