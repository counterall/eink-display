import { cityDate, cityName, pad } from './model';
import { workdayState } from './workday';
import TimeDigits from './TimeDigits';

const TEXT = {
  zh: { title: '工作时间', until: '离下班还有', rest: '下班啦 好好休息！', weekend: '周末啦 不用上班！' },
  en: { title: 'Work hours', until: 'Off work in', rest: 'Work is over. Enjoy your rest!', weekend: 'It’s the weekend. No work today!' },
};

export default function WorkdayBlock({ city, now, language }) {
  const t = TEXT[language === 'zh' ? 'zh' : 'en'];
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
