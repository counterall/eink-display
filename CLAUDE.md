# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A static dashboard (clock, two-city weather, GitHub Trending Top 5 as a weekly / daily carousel) for modern desktop and tablet browsers, landscape or portrait. Kindle / e-ink support was dropped in issue #21. React 18 + Vite + pnpm, no backend, no API keys. The README is in Chinese and is the authoritative feature spec — read the relevant section before changing behavior, and keep it updated when behavior changes.

## Commands

Node ≥ 22, pnpm 10.

```sh
pnpm install
pnpm dev                    # dev server
pnpm test                   # vitest run (all tests)
pnpm exec vitest run src/workday.test.js      # single file
pnpm exec vitest run -t "weekend"             # by test name
pnpm build && pnpm preview  # production build, what e2e checks should run against
pnpm lint:css               # stylelint: CSS unsupported by the browserslist targets
pnpm refresh:trending       # re-scrape github.com/trending?since=weekly and ?since=daily into public/data/github-trending{,-daily}.json
```

There is no JS linter. Tests run in Node with no DOM: component tests use `renderToStaticMarkup` from `react-dom/server` and assert on markup strings.

## Constraints

- Targets are the `browserslist` in `package.json` (last 2 Chrome / Edge / Firefox / Safari / iOS Safari, plus Firefox ESR), checked by stylelint. JS uses Vite's default modern build target; there is no legacy build. `base: './'` so it works from a GitHub Pages subpath.
- CSS variables, Grid, flex `gap`, animations and transitions are fine. Themes are `theme--<name>` classes (dark, sky, sage, lavender, mint; light is the default on `:root`) that only set the variable block at the end of `styles.css`; every other rule uses `var(--…)`, never a literal colour (`styles.test.js` checks this). The coloured themes also get `stage--card` on the stage for their card shapes. Animations must respect `prefers-reduced-motion: reduce`.
- City time: each preset city in `src/model.js` has an IANA `zone`; `cityDate` builds a Date shifted so `getUTC*` reads that zone's wall-clock time via `Intl.DateTimeFormat(...).formatToParts`. Never use the device time zone. Weather slots stay on Helsinki time, workday on the primary city, solar terms on Beijing time.
- Everything is bundled locally (Roboto Condensed font, only the Lucide icons actually used, `lunar-javascript` split into its own `calendar` chunk). No CDNs or runtime third-party requests except Open-Meteo. Network calls go through `fetchJSON` in `src/http.js` (`fetch` + `AbortController` timeout).
- All `localStorage` access goes through `readStored`/`writeStored` in `src/model.js`, which swallow errors (private mode / full storage must not break the page). The keys keep their `kindle-` prefix so saved settings survive.

## Architecture

- **`src/main.jsx`** only mounts **`src/App.jsx`**, the app shell: settings state (persisted under `SETTINGS_KEY` = `kindle-settings-v1`, normalized via `normalizeSettings` / `DEFAULT_SETTINGS` in `model.js` so old saved settings stay compatible) and the minute clock tick (minute-aligned `setTimeout`, re-run on focus/visibility). That `now` value is passed down and also drives weather checks. `Settings.jsx`, `useViewport.js`, `useWeather.js` and `useTrending.js` hold the rest; their timing decisions are pure, tested functions (`shouldFetchWeather`, `shouldResumeTrending`).
- **All UI strings** live in `src/i18n.js` (one table per component, read with `pick(table, language)`); `i18n.test.js` enforces identical zh/en keys.
- **Theme bootstrap**: an inline script in `index.html` reads `kindle-settings-v1` and applies the saved `theme--<name>` class and theme-color before React loads to avoid a white flash. `src/themeBootstrap.test.js` extracts and executes that script in a VM and checks its colors against `THEME_COLORS` in `model.js` — keep the setting key, theme names and colors in sync between `index.html`, `model.js`, `App.jsx`, and that test. The moon/sun toggle switches between `dark` and the remembered `lightTheme` (`toggleTheme` / `withTheme` in `model.js`).
- **Layout/scaling** (`src/layout.js`): no rotation. `viewportLayout` picks a mode — `split` (landscape, Trending on the right), `stacked` (portrait, Trending below the clock panel; the stage may scroll), `fullscreen` (right column hidden) — set as `stage--<mode>` on the stage, and a base font size from the CSS viewport against a per-mode reference (24px at 1448 × 1072; 1072 × 1720 stacked; 29px fullscreen at 1448 × 1072 / 1200 × 1448 portrait), clamped to ⅓–2× and multiplied by the zoom. `primaryTimeFontSize` / `flipTimeFontSize` size the main clock per mode. Everything else sizes in `em`. After render, `stageOverflows` in `App.jsx` steps the zoom down while anything overflows.
- **Weather** (`src/weather.js`, `src/useWeather.js`, `src/model.js`): browser calls Open-Meteo directly per city (current temp + weather code + today/tomorrow daily). Refresh slots are fixed at every 2 hours on **Helsinki time** regardless of selected cities; 15-minute backoff on failure; cached results are kept and marked stale. The shared "updated at" uses the *earlier* of the two cities' successful updates.
- **Trending pipeline**: two lists, `weekly` and `daily`, configured once in `TRENDING_PERIODS` (`src/trendingData.js`: source URL, snapshot file, cache key, stars field `weeklyStars` / `dailyStars`); everything else is parameterized by period. `scripts/refresh-trending.mjs` (Node + Cheerio, build-time only) scrapes each official page, validates with `isTrendingData(data, period)` (shared by script and browser), and atomically writes `public/data/github-trending.json` / `github-trending-daily.json` independently — a failed list leaves its existing file untouched and doesn't stop the other. The browser (`src/trending.js`, `useTrending(period)`) fetches each same-origin JSON hourly, caches under `kindle-trending-weekly-v1` / `kindle-trending-daily-v1`, never lets an older deployed file overwrite a newer cached one, and stops polling when the right column is hidden (`showFeeds: false`). Test fixtures (`trendingData(period)`, `trendingHTML(count, period)`) live in `tests/trending-fixtures.js`.
- **Right-column carousel** (`TrendingCarousel` in `src/TrendingFeed.jsx`, timing in `src/carousel.js`): slides from `CAROUSEL_SLIDES` (weekly, then daily) sit side by side in one translated track; the off-screen slide is `inert` + `aria-hidden`. It advances on App's minute tick via the pure `tickCarousel` every `settings.carouselInterval` minutes (10 | 30 | 60) from the last switch, paused while Settings / the break dialog is open or a mouse hovers it; manual changes (arrows, dots, Left/Right keys, touch swipe) restart the countdown. `stageOverflows` ignores the horizontal position of nodes inside `.carousel-track` but still checks their height.
- **Other logic modules**: `src/workday.js` (8-hour session started by the "Start work" button and persisted under `kindle-work-v1`; countdown/day boundaries in the *primary* city's time, weekend message takes priority unless a session is still running, no holiday detection), `src/breaks.js` + `src/useBreakReminder.js` (break reminder due one hour after any reminder window was last closed, only inside the work session; optional desktop notification via `src/notifications.js`, every `window`/`document`/`Notification` access guarded, sent once per due time recorded as `notifiedFor` and only when the page is hidden or unfocused), `src/solarTerms.js` (Chinese solar term by Beijing-time crossing moment, cached until the next term; and `lunarDateName`, the lunar date for the primary city's calendar day — both always shown in Chinese regardless of UI language). `TimeDigits` is the shared hour/colon/minute renderer used by the main clock, second city, and workday countdown. With `clockStyle: 'flip'` those three render `FlipClock` cards instead (`src/FlipClock.jsx`, `src/FlipCard.jsx`); only the main `LiveFlipClock` ticks every second, inside the component, so App stays on the minute tick.

## CI / deployment

`.github/workflows/deploy.yml` runs on pushes to `main`, `top-feeds`, `fullscreen-time` (except pushes that only change `**.md` files, via `paths-ignore`; `scripts/deploy-workflow.test.js` guards the triggers), manual dispatch, and daily at 06:17 UTC. The `build` job (read-only token) runs install → `refresh:trending` → test → `lint:css` → build. On `main` only, a separate `persist` job (the only one with `contents: write`, running no project code) commits the changed Trending JSON files (weekly and daily) back as "chore: refresh Trending snapshots", rebasing and retrying if `main` moved; `deploy` publishes Pages independently of `persist`. Main runs are never cancelled mid-flight; feature-branch runs are. Because of those bot commits, pull/rebase onto remote `main` before working, and resolve conflicts in the snapshot by regenerating it rather than force-pushing. `public/data/github-trending.json` and `public/data/github-trending-daily.json` must stay committed (they are the persistent fallbacks).

## Issue workflow specifics

GitHub issues are handled with the global `github-issues` skill (`~/.claude/skills/github-issues/`): one worktree per issue under `../eink-display-worktrees/`, tests first, a `code-reviewer` subagent review, then a PR the user merges. This repo adds:

- **Verify**: `pnpm install --frozen-lockfile` in the worktree, then `pnpm test`, `pnpm lint:css`, `pnpm build`.
- **E2E** for UI or timing changes: Playwright against `pnpm preview --port <free>`, with `page.clock`, Open-Meteo blocked, in Chrome + Firefox, at a desktop size and a tablet portrait size. Local WebKit can't run because `libavif16` is missing.
- **Ports**: the user's dev server runs from the main checkout on 5173; `pnpm preview` defaults to 4173. Use another port.
- **Reviewer must check** the Constraints above: browserslist (`pnpm lint:css`), theme colours only in the variable blocks, reduced-motion fallbacks, IANA zones (never the device time zone) for city time, `readStored`/`writeStored` only, zh/en i18n parity, theme-bootstrap key sync, and that the stacked portrait and split landscape layouts both still fit.
- **Never include** the Trending snapshots (`public/data/github-trending.json`, `github-trending-daily.json`) in a feature PR. Bot snapshot commits land on `main` often, so rebase onto `origin/main` right before pushing.
- **Parallel limit**: most features share `App.jsx`, `i18n.js`, `styles.css`, `README.md`. Treat two issues that touch those as overlapping and do them one after another.
