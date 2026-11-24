import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById } from './model';
import FlipCard from './FlipCard';
import FlipClock, { LiveFlipClock, nextSecondDelay } from './FlipClock';
import WorkdayBlock from './WorkdayBlock';

const cardValues = (markup) => [...markup.matchAll(/<span class="flip-card flip-card--(\w+)"/g)].map((match) => match[1]);

describe('flip card', () => {
  it('shows the value in the resting halves and the bottom flap, and does not animate on first render', () => {
    const markup = renderToStaticMarkup(<FlipCard value="07" />);
    expect(markup.match(/>07</g)).toHaveLength(3);
    expect(markup).not.toContain('flip-flap--top');
    expect(markup).not.toContain('flip-flap--turn');
    expect(markup).toContain('flip-hinge');
    expect(markup).toContain('aria-hidden="true"');
  });
});

describe('flip clock', () => {
  it('renders hour and minute cards with the classic screen-reader label', () => {
    const markup = renderToStaticMarkup(<FlipClock parts={{ hours: '09', minutes: '05', period: '' }} label="西安 09:05" />);
    expect(cardValues(markup)).toEqual(['hours', 'minutes']);
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="西安 09:05"');
    expect(markup).not.toContain('flip-period');
  });
  it('puts AM/PM in the hour card in 12-hour mode', () => {
    const markup = renderToStaticMarkup(<FlipClock parts={{ hours: '9', minutes: '05', period: 'PM' }} label="Xi’an 09:05 PM" />);
    expect(markup).toMatch(/<span class="flip-card flip-card--hours"><small class="flip-period" aria-hidden="true">PM<\/small>/);
  });
});

describe('live main flip clock', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T10:30:42Z')); });
  afterEach(() => { vi.useRealTimers(); });
  it('shows hours, minutes and seconds in the city time, without seconds in the label', () => {
    const markup = renderToStaticMarkup(<LiveFlipClock city={cityById('helsinki')} cityLabel="赫尔辛基" format="24" fontSize={150} />);
    expect(cardValues(markup)).toEqual(['hours', 'minutes', 'seconds']);
    expect(markup).toContain('>12<');
    expect(markup).toContain('>30<');
    expect(markup).toContain('>42<');
    expect(markup).toContain('aria-label="赫尔辛基 12:30"');
    expect(markup).toContain('font-size:150px');
  });
  it('labels 12-hour time like the classic clock', () => {
    const markup = renderToStaticMarkup(<LiveFlipClock city={cityById('helsinki')} cityLabel="Helsinki" format="12" fontSize={150} />);
    expect(markup).toContain('aria-label="Helsinki 12:30 PM"');
    expect(markup).toContain('>PM</small>');
  });
  it('schedules the next tick at the start of the next second', () => {
    expect(nextSecondDelay(1000)).toBe(1000 + 20);
    expect(nextSecondDelay(1999)).toBe(1 + 20);
    expect(nextSecondDelay(1500)).toBe(500 + 20);
  });
});

describe('work countdown in the flip look', () => {
  const started = new Date('2026-11-06T08:00Z').getTime();
  it('shows hour and minute cards and keeps the timer label', () => {
    const markup = renderToStaticMarkup(<WorkdayBlock city={cityById('helsinki')} now={new Date('2026-11-06T11:30Z')} language="zh" startedAt={started} onStart={() => {}} clockStyle="flip" />);
    expect(cardValues(markup)).toEqual(['hours', 'minutes']);
    expect(markup).toContain('role="timer"');
    expect(markup).toContain('aria-label="离下班还有 04:30"');
    expect(markup).not.toContain('time-colon');
  });
  it('keeps the classic countdown by default', () => {
    const markup = renderToStaticMarkup(<WorkdayBlock city={cityById('helsinki')} now={new Date('2026-11-06T11:30Z')} language="zh" startedAt={started} onStart={() => {}} />);
    expect(markup).not.toContain('flip-card');
  });
});
