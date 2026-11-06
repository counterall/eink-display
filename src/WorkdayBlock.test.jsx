import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import WorkdayBlock from './WorkdayBlock';

const render = (date, language = 'zh', city = cityById('helsinki')) => renderToStaticMarkup(<WorkdayBlock city={city} now={new Date(date)} language={language} />);

describe('workday block', () => {
  it('shows a padded hour/minute countdown with the correct city and hours', () => {
    const markup = render('2026-11-06T10:30Z');
    expect(markup).toContain('离下班还有');
    expect(markup).toContain('aria-label="离下班还有 04:30"');
    expect(markup).toContain('09:00–17:00 · 赫尔辛基');
    expect(markup).toContain('aria-live="off"');
    expect(markup).toContain('<span class="time-hours">04</span><span class="time-colon">:</span><span class="time-minutes">30</span>');
    expect(markup).not.toContain('work-colon');
  });
  it.each(['2026-11-06T06:00Z', '2026-11-06T15:00Z'])('shows the rest message outside office hours at %s', (date) => {
    const markup = render(date);
    expect(markup).toContain('下班啦 好好休息！');
    expect(markup).not.toContain('role="timer"');
  });
  it('shows the exact Chinese weekend message', () => {
    expect(render('2026-11-07T10:00Z')).toContain('周末啦 不用上班！');
  });
  it('localizes the messages in English', () => {
    expect(render('2026-11-06T10:30Z', 'en')).toContain('Off work in');
    expect(render('2026-11-06T15:00Z', 'en')).toContain('Work is over. Enjoy your rest!');
    expect(render('2026-11-07T10:00Z', 'en')).toContain('It’s the weekend. No work today!');
  });
});
