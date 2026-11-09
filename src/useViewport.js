import { useEffect, useState } from 'react';
import { viewportLayout } from './layout';

export default function useViewport(rotation, showFeeds, zoom) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('orientationchange', resize); };
  }, []);
  return viewportLayout(size.width, size.height, rotation, showFeeds, zoom);
}
