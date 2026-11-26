import { useEffect, useState } from 'react';
import { cityDate, clock, flipParts } from './model';
import FlipCard from './FlipCard';

// Cards for the flip look. `parts` comes from flipParts(); AM/PM sits in the hour card's corner.
// The label stays the classic "city HH:MM (AM/PM)", without seconds.
export default function FlipClock({ parts, keys = ['hours', 'minutes'], label, className = '', style, role = 'img', ariaLive }) {
  return <span className={`flip-clock ${className}`.trim()} style={style} role={role} aria-live={ariaLive} aria-label={label}>
    {keys.map((key) => <FlipCard key={key} kind={key} value={parts[key]}>
      {key === 'hours' && parts.period ? <small className="flip-period" aria-hidden="true">{parts.period}</small> : null}
    </FlipCard>)}
  </span>;
}

// Start of the next second, with a small margin so the tick lands after the change.
export const nextSecondDelay = (ms) => 1000 - ms % 1000 + 20;

// The main city clock in the flip look. It keeps its own once-a-second tick so the rest of the
// app (weather, workday, break reminder, Trending, the automatic fit) stays on App's minute tick.
export function LiveFlipClock({ city, cityLabel, format, fontSize }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      clearTimeout(timer);
      timer = setTimeout(tick, nextSecondDelay(Date.now()));
    };
    const resume = () => { if (!document.hidden) tick(); };
    tick();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, []);
  const date = cityDate(city, now);
  const time = clock(date, format);
  return <FlipClock parts={flipParts(date, format)} keys={['hours', 'minutes', 'seconds']} className="flip-clock--primary" style={{ fontSize }}
    label={`${cityLabel} ${time.digits}${time.period ? ` ${time.period}` : ''}`} />;
}
