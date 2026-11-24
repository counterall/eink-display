import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import WorkdayBlock from './WorkdayBlock';

const started = new Date('2026-11-06T08:00Z').getTime(); // 10:00 Helsinki
const render = (date, startedAt = started, language = 'zh', city = cityById('helsinki'), clockStyle = 'classic') => renderToStaticMarkup(<WorkdayBlock city={city} now={new Date(date)} language={language} startedAt={startedAt} onStart={() => {}} clockStyle={clockStyle} />);

describe('workday tile', () => {
  it('labels the tile with the title and the primary city in every state', () => {
    expect(render('2026-11-06T11:30Z')).toContain('<span class="eyebrow work-meta">工作时间 · 赫尔辛基</span>');
    expect(render('2026-11-06T06:00Z', null)).toContain('<span class="eyebrow work-meta">工作时间 · 赫尔辛基</span>');
    expect(render('2026-11-07T10:00Z', null, 'en')).toContain('<span class="eyebrow work-meta">Work hours · Helsinki</span>');
  });
  it('shows a padded hour/minute countdown followed by the 后下班 label', () => {
    const markup = render('2026-11-06T11:30Z');
    expect(markup).toContain('aria-label="离下班还有 04:30"');
    expect(markup).toContain('aria-live="off"');
    expect(markup).toContain('<span class="time-hours">04</span><span class="time-colon">:</span><span class="time-minutes">30</span>');
    // The visible label comes after the digits, like 今天 next to the second city.
    expect(markup).toMatch(/role="timer"[\s\S]*<\/strong><span class="work-caption">后下班<\/span>/);
    expect(markup).not.toContain('>离下班还有<');
    expect(markup).not.toContain('work-start');
  });
  it('draws the 8-hour bar with start, end and worked time', () => {
    const markup = render('2026-11-06T11:30:40Z'); // 13:30 Helsinki, 3.5 h of 8 h
    expect(markup).toContain('<div class="work-bar" aria-hidden="true"><div class="work-bar-fill" style="width:43.75%"></div></div>');
    expect(markup).toContain('<div class="work-bar-labels"><span>10:00</span><span class="work-worked">已工作 3:30</span><span>18:00</span></div>');
  });
  it('shows start/end in the primary city time', () => {
    const markup = render('2026-11-06T11:30Z', started, 'zh', cityById('xian'));
    expect(markup).toContain('<span>16:00</span><span class="work-worked">已工作 3:30</span><span>00:00</span>');
    expect(markup).toContain('工作时间 · 西安');
  });
  it('starts the bar empty and keeps it static (plain percentage width)', () => {
    expect(render('2026-11-06T08:00:30Z')).toContain('style="width:0%"');
    expect(render('2026-11-06T08:00:30Z')).toContain('已工作 0:00');
  });
  it('uses flip cards with the label after them in the flip look', () => {
    const markup = render('2026-11-06T11:30Z', started, 'en', cityById('helsinki'), 'flip');
    expect(markup).toContain('flip-clock--work');
    expect(markup).toContain('aria-label="Off work in 04:30"');
    expect(markup).toMatch(/flip-clock--work[\s\S]*<\/span><span class="work-caption">to go<\/span>/);
    expect(markup).toContain('worked 3:30');
  });
  it('shows the "Start work" button before work has started today', () => {
    const markup = render('2026-11-06T06:00Z', null);
    expect(markup).toContain('<button type="button" class="work-start filled-button">开始工作</button>');
    expect(markup).not.toContain('role="timer"');
    expect(markup).not.toContain('work-bar');
  });
  it('shows the rest message once the eight hours are over', () => {
    const markup = render('2026-11-06T16:00Z');
    expect(markup).toContain('<p class="work-message">下班啦 好好休息！</p>');
    expect(markup).not.toContain('work-start');
    expect(markup).not.toContain('work-bar');
  });
  it('shows the exact Chinese weekend message without the button', () => {
    const markup = render('2026-11-07T10:00Z', null);
    expect(markup).toContain('周末啦 不用上班！');
    expect(markup).not.toContain('work-start');
  });
  it('localizes the messages in English', () => {
    expect(render('2026-11-06T11:30Z', started, 'en')).toContain('Off work in 04:30');
    expect(render('2026-11-06T11:30Z', started, 'en')).toContain('<span class="work-caption">to go</span>');
    expect(render('2026-11-06T06:00Z', null, 'en')).toContain('>Start work</button>');
    expect(render('2026-11-06T16:00Z', started, 'en')).toContain('Work is over. Enjoy your rest!');
    expect(render('2026-11-07T10:00Z', null, 'en')).toContain('It’s the weekend. No work today!');
  });
});
