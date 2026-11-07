import { cityDate, cityName, pad } from './model';
import { workdayState } from './workday';
import TimeDigits from './TimeDigits';
import { WORKDAY_TEXT, pick } from './i18n';

export default function WorkdayBlock({ city, now, language }) {
  const t = pick(WORKDAY_TEXT, language);
  const state = workdayState(cityDate(city, now));
  const remaining = state.type === 'working' ? `${pad(state.hours)}:${pad(state.minutes)}` : '';
  return <section className="workday-block" aria-label={t.title}>
    <header className="work-meta"><span>{t.title}</span><span className="work-meta-detail">09:00–17:00 · {cityName(city, language)}</span></header>
    {state.type === 'working' ? <div className="work-active">
      <span className="work-caption">{t.until}</span>
      <strong className="work-countdown" role="timer" aria-live="off" aria-label={`${t.until} ${remaining}`}>
        <TimeDigits digits={remaining} />
      </strong>
    </div> : <p className="work-message">{t[state.type]}</p>}
  </section>;
}
