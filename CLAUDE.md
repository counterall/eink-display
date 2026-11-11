# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A static, black-and-white landscape dashboard (clock, two-city weather, GitHub weekly Trending Top 5) for a 6" Kindle Paperwhite browser (1072 × 1448 screen, shown landscape at 1448 × 1072). React 18 + Vite + pnpm, no backend, no API keys. The README is in Chinese and is the authoritative feature spec — read the relevant section before changing behavior, and keep it updated when behavior changes.

## Commands

Node ≥ 22, pnpm 10.

```sh
pnpm install
pnpm dev                    # dev server (not for testing on the Kindle — use build + preview)
pnpm test                   # vitest run (all tests)
pnpm exec vitest run src/workday.test.js      # single file
pnpm exec vitest run -t "weekend"             # by test name
pnpm build && pnpm preview  # production/legacy build, what the Kindle should be tested against
pnpm check:legacy           # after build: fail if legacy chunks contain syntax Safari 9 / Chrome 49 can't parse
pnpm lint:css               # stylelint: unsupported CSS for the browserslist targets, plus banned animation/transition/filter
pnpm refresh:trending       # re-scrape github.com/trending?since=weekly into public/data/github-trending.json
```

There is no JS linter. Tests run in Node with no DOM: component tests use `renderToStaticMarkup` from `react-dom/server` and assert on markup strings.

## Hard constraints (old Kindle WebKit)

- Targets are the `browserslist` in `package.json` (Safari ≥ 9 / Chrome ≥ 49), read by both `@vitejs/plugin-legacy` (`vite.config.js`) and stylelint. `base: './'` so it works from a GitHub Pages subpath.
- `scripts/check-legacy.mjs` is a custom AST check, not ES5-only: Safari 9 supports template literals, computed keys and for-of, which Babel correctly leaves in the legacy chunks.
- CSS must avoid Grid, flex `gap`, animations, CSS variables and filters (enforced by `.stylelintrc.json`; the ignored features there are deliberate progressive enhancements). Dark theme is a `theme--dark` class, not variables/invert.
- Do not use `Intl` or the device time zone for city time. `src/model.js` holds the preset cities with fixed UTC offsets plus the EU DST rule (`dst: true`); adding a city or DST policy changes means editing this table.
- Everything is bundled locally (Roboto Condensed font, only the Lucide icons actually used, `lunar-javascript` split into its own `calendar` chunk). No CDNs or runtime third-party requests except Open-Meteo.
- All `localStorage` access goes through `readStored`/`writeStored` in `src/model.js`, which swallow errors (private mode / full storage must not break the page).

## Architecture

- **`src/main.jsx`** only mounts **`src/App.jsx`**, the app shell: settings state (persisted under `SETTINGS_KEY` = `kindle-settings-v1`, normalized via `normalizeSettings` / `DEFAULT_SETTINGS` in `model.js` so old saved settings stay compatible) and the minute clock tick (minute-aligned `setTimeout`, re-run on focus/visibility). That `now` value is passed down and also drives weather checks. `Settings.jsx`, `useViewport.js`, `useWeather.js` and `useTrending.js` hold the rest; their timing decisions are pure, tested functions (`shouldFetchWeather`, `shouldResumeTrending`).
- **All UI strings** live in `src/i18n.js` (one table per component, read with `pick(table, language)`); `i18n.test.js` enforces identical zh/en keys.
- **Theme bootstrap**: an inline script in `index.html` reads `kindle-settings-v1` and applies `theme--dark` before React loads to avoid a white flash. `src/themeBootstrap.test.js` extracts and executes that script in a VM — keep the setting key and class name in sync between `index.html`, `main.jsx`, and that test.
- **Layout/scaling** (`src/layout.js`): computes a base font size from the actual CSS viewport relative to the 1448 × 1072 reference (24px base, 26px in fullscreen-time mode) and handles rotation (auto / none / cw / ccw — auto rotates 90° when the viewport is portrait). Everything else sizes in `em`.
- **Weather** (`src/weather.js`, `src/useWeather.js`, `src/model.js`): browser calls Open-Meteo directly per city (current temp + weather code + today/tomorrow daily). Refresh slots are fixed at every 2 hours on **Helsinki time** regardless of selected cities; 15-minute backoff on failure; cached results are kept and marked stale. The shared "updated at" uses the *earlier* of the two cities' successful updates.
- **Trending pipeline**: `scripts/refresh-trending.mjs` (Node + Cheerio, build-time only) scrapes the official HTML, validates with `src/trendingData.js` (shared by script and browser), and atomically writes `public/data/github-trending.json` — on any failure it leaves the existing file untouched. The browser (`src/trending.js`, `src/useTrending.js`) fetches that same-origin JSON hourly, caches under `kindle-trending-weekly-v1`, never lets an older deployed file overwrite a newer cached one, and stops polling when the right column is hidden (`showFeeds: false`). Test fixtures live in `tests/trending-fixtures.js`.
- **Other logic modules**: `src/workday.js` (8-hour session started by the "Start work" button and persisted under `kindle-work-v1`; countdown/day boundaries in the *primary* city's time, weekend message takes priority unless a session is still running, no holiday detection), `src/breaks.js` + `src/useBreakReminder.js` (break reminder due one hour after any reminder window was last closed, only inside the work session), `src/solarTerms.js` (Chinese solar term by Beijing-time crossing moment, cached until the next term; and `lunarDateName`, the lunar date for the primary city's calendar day — both always shown in Chinese regardless of UI language). `TimeDigits` is the shared hour/colon/minute renderer used by the main clock, second city, and workday countdown.

## CI / deployment

`.github/workflows/deploy.yml` runs on pushes to `main`, `top-feeds`, `fullscreen-time` (except pushes that only change `**.md` files, via `paths-ignore`; `scripts/deploy-workflow.test.js` guards the triggers), manual dispatch, and daily at 06:17 UTC. The `build` job (read-only token) runs install → `refresh:trending` → test → `lint:css` → build → `check:legacy`. On `main` only, a separate `persist` job (the only one with `contents: write`, running no project code) commits the changed Trending JSON back as "chore: refresh weekly Trending snapshot", rebasing and retrying if `main` moved; `deploy` publishes Pages independently of `persist`. Main runs are never cancelled mid-flight; feature-branch runs are. Because of those bot commits, pull/rebase onto remote `main` before working, and resolve conflicts in the snapshot by regenerating it rather than force-pushing. `public/data/github-trending.json` must stay committed (it is the persistent fallback).

## Working on GitHub issues

When asked to handle open issues (`gh issue list --state open`):

1. **Read the whole issue** (`gh issue view <n> --comments`) and the README section it touches. Turn it into concrete acceptance criteria. If something is ambiguous, pick the reasonable option and list it under "Behaviour choices to review" in the PR. Stop and ask only when a choice would be hard to undo (data format, removing a feature).
2. **One worktree per issue, based on the latest main**: `git fetch origin main && git worktree add ../eink-display-worktrees/issue-<n>-<slug> -b issue-<n>-<slug> origin/main`, then `pnpm install` inside it. Never develop an issue in the main checkout; the user's dev server runs from it on port 5173.
3. **Test-driven**: write failing vitest tests from the acceptance criteria first, then implement until they pass. Update existing tests whose expectations the issue changes, and update the README spec (plus this file if the architecture changes).
4. **Verify**: `pnpm test`, `pnpm lint:css`, `pnpm build`, `pnpm check:legacy`. For UI or timing changes, also run a Playwright e2e check against `pnpm preview --port <free port, not 5173/4173>`. Install Playwright in the scratchpad, not as a project dependency. Use `page.clock` for time-based behaviour, block Open-Meteo, and run in Chrome + Firefox (local WebKit needs `libavif16`).
5. **Independent code review in a subagent**: give it the issue text and `git diff origin/main...HEAD`, not your own reasoning, and ask for correctness bugs, Kindle-constraint violations (see Hard constraints) and missing tests. The reviewer reports only and doesn't edit. Fix the findings that matter, rerun step 4, and note any declined findings with the reason in the PR.
6. **Ship**: rebase onto `origin/main` (bot snapshot commits land often; never include `public/data/github-trending.json` changes in a feature PR), push, and `gh pr create` with `Closes #<n>`, a summary, behaviour choices and the test/e2e results. Do not merge; the user reviews. Remove the worktree (`git worktree remove`) once the PR is merged.

**Multiple issues**: work on at most two at once, one yourself and one in a single subagent in its own worktree, briefed with the steps above. Only run them in parallel if they touch largely separate files (most features share `App.jsx`, `i18n.js`, `styles.css`, `README.md`). Otherwise do them one after another, and start the second from `main` after the first PR merges, or tell the user it will need a rebase. Remaining issues wait.
