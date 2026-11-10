import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import WorkdayBlock from './WorkdayBlock';

const started = new Date('2026-11-06T08:00Z').getTime(); // 10:00 Helsinki
const render = (date, startedAt = started, language = 'zh', city = cityById('helsinki')) => renderToStaticMarkup(<WorkdayBlock city={city} now={new Date(date)} language={language} startedAt={startedAt} onStart={() => {}} />);

describe('workday block', () => {
  it('shows a padded hour/minute countdown with the session hours and city', () => {
    const markup = render('2026-11-06T11:30Z');
    expect(markup).toContain('离下班还有');
    expect(markup).toContain('aria-label="离下班还有 04:30"');
    expect(markup).toContain('10:00–18:00 · 赫尔辛基');
    expect(markup).toContain('aria-live="off"');
    expect(markup).toContain('<span class="time-hours">04</span><span class="time-colon">:</span><span class="time-minutes">30</span>');
    expect(markup).not.toContain('work-start');
  });
  it('shows the session hours in the primary city time', () => {
    expect(render('2026-11-06T11:30Z', started, 'zh', cityById('xian'))).toContain('16:00–00:00 · 西安');
  });
  it('shows the "Start work" button before work has started today', () => {
    const markup = render('2026-11-06T06:00Z', null);
    expect(markup).toContain('<button type="button" class="work-start filled-button">开始工作</button>');
    expect(markup).toContain('<span class="work-meta-detail">赫尔辛基</span>');
    expect(markup).not.toContain('role="timer"');
    expect(markup).not.toContain('09:00–17:00');
  });
  it('shows the rest message once the eight hours are over', () => {
    const markup = render('2026-11-06T16:00Z');
    expect(markup).toContain('下班啦 好好休息！');
    expect(markup).toContain('10:00–18:00 · 赫尔辛基');
    expect(markup).not.toContain('work-start');
  });
  it('shows the exact Chinese weekend message without the button', () => {
    const markup = render('2026-11-07T10:00Z', null);
    expect(markup).toContain('周末啦 不用上班！');
    expect(markup).not.toContain('work-start');
  });
  it('localizes the messages in English', () => {
    expect(render('2026-11-06T11:30Z', started, 'en')).toContain('Off work in');
    expect(render('2026-11-06T06:00Z', null, 'en')).toContain('>Start work</button>');
    expect(render('2026-11-06T16:00Z', started, 'en')).toContain('Work is over. Enjoy your rest!');
    expect(render('2026-11-07T10:00Z', null, 'en')).toContain('It’s the weekend. No work today!');
  });
});
