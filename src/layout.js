export const KINDLE_REFERENCE = { width: 1448, height: 1072, fontSize: 24 };

// Work in CSS pixels, not physical screen pixels. A Kindle reporting half-size
// CSS dimensions should get the same layout at half scale, not a cropped page.
export function viewportLayout(rawWidth, rawHeight, rotation = 'auto') {
  const viewportWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1;
  const viewportHeight = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1;
  const direction = rotation === 'auto' ? (viewportHeight > viewportWidth ? 'cw' : 'none') : rotation;
  const rotated = direction === 'cw' || direction === 'ccw';
  const width = rotated ? viewportHeight : viewportWidth;
  const height = rotated ? viewportWidth : viewportHeight;
  const scale = Math.min(width / KINDLE_REFERENCE.width, height / KINDLE_REFERENCE.height);
  const fontSize = Math.max(8, Math.min(KINDLE_REFERENCE.fontSize, KINDLE_REFERENCE.fontSize * scale));
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
