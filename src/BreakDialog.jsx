import { useEffect, useRef, useState } from 'react';
import { Coffee, X } from 'lucide-react';
import { BREAK_DURATIONS, elapsedPercent, formatRemaining, nextRemainingSecondDelay } from './breaks';
import { BREAK_TEXT, pick } from './i18n';
import TimeDigits from './TimeDigits';
import FlipClock from './FlipClock';

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

// `closing` (issue #37): the pill is sliding away after it was closed. The break logic has already
// run, so it takes no more input, and `onClosed` unmounts it when the slide-out ends.
export default function BreakDialog({ mode, endsAt = null, duration = null, clockStyle = 'classic', language, closing = false, onDismiss: dismiss, onStart: start, onClosed }) {
  // A key press on a still-focused button of the sliding-away pill must not act a second time.
  const onDismiss = () => { if (!closing) dismiss(); };
  const onStart = (minutes) => { if (!closing) start(minutes); };
  const t = pick(BREAK_TEXT, language);
  const label = (value) => `${value}${t.minutesSuffix}`;
  const [minutes, setMinutes] = useState(BREAK_DURATIONS[0]);
  const first = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    if (closing) return undefined;
    const target = first.current || closeRef.current;
    if (target) target.focus();
    const keydown = (event) => { if (event.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [mode, closing]);
  // The prompt and the resting countdown are small glass pills at the top (issues #29, #37): no
  // overlay, the page stays usable, so not modal. Only the "new day" welcome is a centred dialog.
  const pill = mode !== 'welcome';
  const panelClass = pill ? ` break-panel--pill break-panel--${mode === 'prompt' ? 'prompt' : 'resting'}${closing ? ' break-panel--closing' : ''}` : '';
  // Flip-card turns inside the pill bubble their own animationend: only the panel's slide-out counts.
  const slideEnd = (event) => { if (closing && onClosed && event.target === event.currentTarget) onClosed(); };
  return <div className={`settings-layer break-layer${pill ? ' break-layer--pill' : ''}`}>
    <section className={`settings-panel break-panel${panelClass}`} role="dialog" onAnimationEnd={slideEnd}
      {...(mode === 'running' ? { 'aria-modal': 'false', 'aria-label': t.resting } : { 'aria-modal': pill ? 'false' : 'true', 'aria-labelledby': 'break-title' })}>
      <button ref={mode === 'welcome' ? closeRef : undefined} type="button" className="break-close" aria-label={t.close} title={t.close} onClick={onDismiss}><X strokeWidth={1.8} aria-hidden="true" /></button>
      {mode === 'welcome' ? <div className="break-running break-welcome">
        <h2 id="break-title" className="break-caption">{t.welcome}</h2>
      </div> : mode === 'prompt' ? <>
        <h2 id="break-title" className="break-pill-title">{t.title} <Coffee className="break-icon" strokeWidth={1.8} aria-hidden="true" /></h2>
        <div className="break-prompt-controls">
          <div className="break-chips" role="group" aria-label={t.duration}>
            {BREAK_DURATIONS.map((value) => <button key={value} ref={value === minutes ? first : undefined} type="button" className="break-chip" aria-pressed={value === minutes ? 'true' : 'false'} onClick={() => setMinutes(value)}>{label(value)}</button>)}
          </div>
          <div className="break-actions">
            <button type="button" onClick={onDismiss}>{t.later}</button>
            <button type="button" className="filled-button" onClick={() => onStart(minutes)}>{t.start}</button>
          </div>
        </div>
      </> : <RestingTimer endsAt={endsAt} duration={duration} clockStyle={clockStyle} t={t} />}
    </section>
  </div>;
}
