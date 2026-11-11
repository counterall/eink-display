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
