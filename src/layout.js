export const KINDLE_REFERENCE = { width: 1448, height: 1072, fontSize: 24 };

// Work in CSS pixels, not physical screen pixels. A Kindle reporting half-size
// CSS dimensions should get the same layout at half scale, not a cropped page.
export function viewportLayout(rawWidth, rawHeight, rotation = 'auto', showFeeds = true, zoom = 100) {
  const viewportWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1;
  const viewportHeight = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1;
  const direction = rotation === 'auto' ? (viewportHeight > viewportWidth ? 'cw' : 'none') : rotation;
  const rotated = direction === 'cw' || direction === 'ccw';
  const width = rotated ? viewportHeight : viewportWidth;
  const height = rotated ? viewportWidth : viewportHeight;
  const scale = Math.min(width / KINDLE_REFERENCE.width, height / KINDLE_REFERENCE.height);
  const referenceFont = showFeeds ? KINDLE_REFERENCE.fontSize : 29;
  const fontSize = Math.max(8 * referenceFont / KINDLE_REFERENCE.fontSize, Math.min(referenceFont, referenceFont * scale)) * zoom / 100;
  return {
    viewportWidth, viewportHeight, width, height,
    style: {
      width, height, fontSize,
      left: direction === 'cw' ? viewportWidth : 0,
      top: direction === 'ccw' ? viewportHeight : 0,
      transform: direction === 'cw' ? 'rotate(90deg)' : direction === 'ccw' ? 'rotate(-90deg)' : 'none',
    },
  };
}

export function primaryTimeFontSize(width, height, showFeeds = true, zoom = 100) {
  // Keep a little horizontal headroom for the wider Arial fallback as well.
  const size = showFeeds ? Math.min(width * .17, height * .30) : Math.min(width * .23, height * (width < 650 ? .27 : .31));
  return size * zoom / 100;
}

// The flip look puts three fixed-width cards (hours | minutes | seconds) where the classic
// clock puts HH:MM, so it needs a smaller font: about 4em of cards must fit the column.
// Card height (1.2em) stays close to the classic digit height (.8em of primaryTimeFontSize).
export function flipTimeFontSize(width, height, showFeeds = true, zoom = 100) {
  const size = showFeeds ? Math.min(width * .105, height * .19) : Math.min(width * .2, height * (width < 650 ? .18 : .205));
  return size * zoom / 100;
}
