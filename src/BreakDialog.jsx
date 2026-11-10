import { useEffect, useRef, useState } from 'react';
import { Coffee, X } from 'lucide-react';
import { BREAK_DURATIONS } from './breaks';
import { BREAK_TEXT, pick } from './i18n';

export default function BreakDialog({ mode, minutesLeft, elapsed = 0, language, onDismiss, onStart }) {
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
  return <div className="settings-layer break-layer">
    <section className="settings-panel break-panel" role="dialog" aria-modal="true" aria-labelledby="break-title">
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
      </> : <div className="break-running" aria-live="polite">
        <h2 id="break-title" className="break-caption">{t.resting}</h2>
        <p className="break-countdown" role="timer">{label(minutesLeft)}</p>
        <div className="break-progress" role="progressbar" aria-label={t.progress} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(elapsed)}>
          <div className="break-progress-fill" style={{ width: `${elapsed}%` }} />
        </div>
      </div>}
    </section>
  </div>;
}
