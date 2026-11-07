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
- **Other logic modules**: `src/workday.js` (Mon–Fri 09:00–17:00 countdown in the *primary* city's time, weekend message takes priority, no holiday detection), `src/solarTerms.js` (Chinese solar term by Beijing-time crossing moment, always shown in Chinese, cached until the next term). `TimeDigits` is the shared hour/colon/minute renderer used by the main clock, second city, and workday countdown.

## CI / deployment

`.github/workflows/deploy.yml` runs on pushes to `main`, `top-feeds`, `fullscreen-time`, manual dispatch, and daily at 06:17 UTC. The `build` job (read-only token) runs install → `refresh:trending` → test → `lint:css` → build → `check:legacy`. On `main` only, a separate `persist` job (the only one with `contents: write`, running no project code) commits the changed Trending JSON back as "chore: refresh weekly Trending snapshot", rebasing and retrying if `main` moved; `deploy` publishes Pages independently of `persist`. Main runs are never cancelled mid-flight; feature-branch runs are. Because of those bot commits, pull/rebase onto remote `main` before working, and resolve conflicts in the snapshot by regenerating it rather than force-pushing. `public/data/github-trending.json` must stay committed (it is the persistent fallback).
