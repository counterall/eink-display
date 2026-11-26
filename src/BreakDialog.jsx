import { useEffect, useRef, useState } from 'react';
import { Coffee, X } from 'lucide-react';
import { BREAK_DURATIONS, elapsedPercent, formatRemaining } from './breaks';
import { BREAK_TEXT, pick } from './i18n';
import TimeDigits from './TimeDigits';
import FlipClock from './FlipClock';

// Wait until the remaining time drops to the next whole second (plus a small margin).
const nextRemainingSecondDelay = (endsAt, nowMs) => ((endsAt - nowMs) % 1000 + 1000) % 1000 + 20;

// The resting countdown: only mm:ss (classic digits or flip cards, like the work
// countdown) and the elapsed bar. It ticks once a second on its own, computed from the
// break's end time, so the rest of the app stays on the minute clock.
function RestingTimer({ endsAt, duration, clockStyle, t }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    let timer;
    const tick = () => {
      const current = Date.now();
      setNowMs(current);
      clearTimeout(timer);
      if (endsAt > current) timer = setTimeout(tick, nextRemainingSecondDelay(endsAt, current));
    };
    const resume = () => { if (!document.hidden) tick(); };
    tick();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, [endsAt]);
  const left = formatRemaining(endsAt - nowMs);
  const [minutes, seconds] = left.split(':');
  const label = `${t.resting} ${left}`;
  const elapsed = elapsedPercent(endsAt, duration, nowMs);
  return <div className="break-running">
    {clockStyle === 'flip'
      ? <FlipClock className="flip-clock--break" role="timer" ariaLive="off" label={label} parts={{ hours: minutes, minutes: seconds, period: '' }} />
      : <strong className="break-countdown" role="timer" aria-live="off" aria-label={label}><TimeDigits digits={left} /></strong>}
    <div className="break-progress" role="progressbar" aria-label={t.progress} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(elapsed)}>
      <div className="break-progress-fill" style={{ width: `${elapsed}%` }} />
    </div>
  </div>;
}

export default function BreakDialog({ mode, endsAt = null, duration = null, clockStyle = 'classic', language, onDismiss, onStart }) {
  const t = pick(BREAK_TEXT, language);
  const label = (value) => `${value}${t.minutesSuffix}`;
  const [minutes, setMinutes] = useState(BREAK_DURATIONS[0]);
  const first = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    const target = first.current || closeRef.current;
    if (target) target.focus();
    const keydown = (event) => { if (event.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [mode]);
  // While resting, a small glass pill at the top: no overlay, the page stays usable, so not modal.
  const resting = mode === 'running';
  return <div className={`settings-layer break-layer${resting ? ' break-layer--resting' : ''}`}>
    <section className={`settings-panel break-panel${resting ? ' break-panel--pill' : ''}`} role="dialog"
      {...(resting ? { 'aria-modal': 'false', 'aria-label': t.resting } : { 'aria-modal': 'true', 'aria-labelledby': 'break-title' })}>
      <button ref={mode === 'welcome' ? closeRef : undefined} type="button" className="break-close" aria-label={t.close} title={t.close} onClick={onDismiss}><X strokeWidth={1.8} aria-hidden="true" /></button>
      {mode === 'welcome' ? <div className="break-running break-welcome">
        <h2 id="break-title" className="break-caption">{t.welcome}</h2>
      </div> : mode === 'prompt' ? <>
        <header><h2 id="break-title">{t.title} <Coffee className="break-icon" strokeWidth={1.8} aria-hidden="true" /></h2></header>
        <label className="break-field">{t.duration}
          <select ref={first} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
            {BREAK_DURATIONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
        <footer className="break-actions">
          <button type="button" onClick={onDismiss}>{t.later}</button>
          <button type="button" className="filled-button" onClick={() => onStart(minutes)}>{t.start}</button>
        </footer>
      </> : <RestingTimer endsAt={endsAt} duration={duration} clockStyle={clockStyle} t={t} />}
    </section>
  </div>;
}
