import { cityDate, cityName, clock, pad } from './model';
import { workdayState, workEndAt, workProgress, workedText } from './workday';
import TimeDigits from './TimeDigits';
import FlipClock from './FlipClock';
import { WORKDAY_TEXT, pick } from './i18n';

// The work-session tile beside the second city: label, then (while working) a static
// 8-hour bar with start / worked / end under it and the countdown with "to go" after it.
export default function WorkdayBlock({ city, now, language, startedAt = null, onStart, clockStyle = 'classic' }) {
  const t = pick(WORKDAY_TEXT, language);
  const state = workdayState(city, now, startedAt);
  const label = <span className="eyebrow work-meta">{t.title} · {cityName(city, language)}</span>;
  if (state.type !== 'working') {
    return <section className="workday-block clock-tile" aria-label={t.title}>
      {label}
      {state.type === 'idle'
        ? <div className="work-active"><button type="button" className="work-start filled-button" onClick={onStart}>{t.start}</button></div>
        : <p className="work-message">{t[state.type]}</p>}
    </section>;
  }
  const remaining = `${pad(state.hours)}:${pad(state.minutes)}`;
  const at = (ms) => clock(cityDate(city, new Date(ms)), '24').digits;
  const progress = workProgress(startedAt, now.getTime());
  // Plain percentage width, redrawn on the minute tick; no transition (Kindle).
  const width = `${Math.round(progress.fraction * 10000) / 100}%`;
  return <section className="workday-block clock-tile" aria-label={t.title}>
    {label}
    <div className="work-progress">
      <div className="work-bar" aria-hidden="true"><div className="work-bar-fill" style={{ width }} /></div>
      <div className="work-bar-labels"><span>{at(startedAt)}</span><span className="work-worked">{t.worked} {workedText(progress.minutes)}</span><span>{at(workEndAt(startedAt))}</span></div>
    </div>
    <div className="work-active">
      {clockStyle === 'flip'
        ? <FlipClock className="flip-clock--work clock-tile-time" role="timer" ariaLive="off" label={`${t.until} ${remaining}`} parts={{ hours: pad(state.hours), minutes: pad(state.minutes), period: '' }} />
        : <strong className="work-countdown clock-tile-time" role="timer" aria-live="off" aria-label={`${t.until} ${remaining}`}>
          <TimeDigits digits={remaining} />
        </strong>}
      <span className="work-caption">{t.toGo}</span>
    </div>
  </section>;
}
