import { useEffect, useState } from 'react';
import { viewportLayout } from './layout';

export default function useViewport(showFeeds, zoom) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return viewportLayout(size.width, size.height, showFeeds, zoom);
}
