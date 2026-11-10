import { cityDate, cityName, clock, pad } from './model';
import { workdayState, workEndAt } from './workday';
import TimeDigits from './TimeDigits';
import { WORKDAY_TEXT, pick } from './i18n';

export default function WorkdayBlock({ city, now, language, startedAt = null, onStart }) {
  const t = pick(WORKDAY_TEXT, language);
  const state = workdayState(city, now, startedAt);
  const remaining = state.type === 'working' ? `${pad(state.hours)}:${pad(state.minutes)}` : '';
  const at = (ms) => clock(cityDate(city, new Date(ms)), '24').digits;
  const hours = state.type === 'working' || state.type === 'rest' ? `${at(startedAt)}–${at(workEndAt(startedAt))} · ` : '';
  return <section className="workday-block" aria-label={t.title}>
    <header className="work-meta"><span>{t.title}</span><span className="work-meta-detail">{hours}{cityName(city, language)}</span></header>
    {state.type === 'working' ? <div className="work-active">
      <span className="work-caption">{t.until}</span>
      <strong className="work-countdown" role="timer" aria-live="off" aria-label={`${t.until} ${remaining}`}>
        <TimeDigits digits={remaining} />
      </strong>
    </div> : state.type === 'idle' ? <div className="work-active">
      <button type="button" className="work-start filled-button" onClick={onStart}>{t.start}</button>
    </div> : <p className="work-message">{t[state.type]}</p>}
  </section>;
}
