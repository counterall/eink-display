// Responsive sizing for desktop and tablet browsers. Everything in the page is sized in `em`
// from one base font size, scaled from the viewport against a reference size for its layout
// (1448 × 1072 landscape, 1200 × 1448 portrait, 1072 × 1600 stacked; 24px with the right column,
// 29px fullscreen). The base can grow on large screens up to twice the reference and shrinks down
// to a third of it.
//
// Modes:
// - split: landscape with the right column, clock panel and Trending side by side;
// - stacked: portrait with the right column, Trending drops below the clock panel;
// - fullscreen: right column hidden, the clock panel takes the whole page.
export const LANDSCAPE = { width: 1448, height: 1072 };
// Fullscreen portrait keeps the side-by-side second-city and work tiles, which need about 39em
// of width at the 29px fullscreen base: 1200 / 29 ≈ 41em.
export const PORTRAIT = { width: 1200, height: 1448 };
// Stacked portrait holds the clock panel and all of Trending in one column, so it needs more
// height per em than the other layouts.
export const STACKED = { width: 1072, height: 1600 };
export const BASE_FONT = 24;
export const FULLSCREEN_FONT = 29;
const MIN_SCALE = 1 / 3, MAX_SCALE = 2;

export function layoutMode(width, height, showFeeds = true) {
  if (!showFeeds) return 'fullscreen';
  return height > width ? 'stacked' : 'split';
}

export function viewportLayout(rawWidth, rawHeight, showFeeds = true, zoom = 100) {
  const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1;
  const height = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1;
  const mode = layoutMode(width, height, showFeeds);
  const reference = mode === 'stacked' ? STACKED : height > width ? PORTRAIT : LANDSCAPE;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(width / reference.width, height / reference.height)));
  const fontSize = (showFeeds ? BASE_FONT : FULLSCREEN_FONT) * scale * zoom / 100;
  return { width, height, mode, style: { width, height, fontSize } };
}

// Main clock size for the classic look. Roboto Condensed HH:MM is about 2.38em wide (digits
// .503em, colon .264em + .1em margin), so 18% of the page width fits the split column (issue #15).
// Stacked portrait has the whole width but must leave about half the height to Trending.
// The wider Arial fallback can overflow; the zoom check in App then steps the zoom down.
export function primaryTimeFontSize(width, height, mode = 'split', zoom = 100) {
  let size;
  if (mode === 'fullscreen') size = Math.min(width * .25, height * (width < 650 ? .27 : .33));
  else if (mode === 'stacked') size = Math.min(width * .3, height * .1);
  else size = Math.min(width * .18, height * .30);
  return size * zoom / 100;
}

// The flip look puts three fixed-width cards (hours | minutes | seconds) where the classic
// clock puts HH:MM, so it needs a smaller font: about 4em of cards must fit the column.
// Card height (1.2em) stays close to the classic digit height (.8em of primaryTimeFontSize).
export function flipTimeFontSize(width, height, mode = 'split', zoom = 100) {
  let size;
  if (mode === 'fullscreen') size = Math.min(width * .2, height * (width < 650 ? .18 : .23));
  else if (mode === 'stacked') size = Math.min(width * .2, height * .07);
  else size = Math.min(width * .108, height * .19);
  return size * zoom / 100;
}
