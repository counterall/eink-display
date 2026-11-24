import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cityById, flipParts } from './model';
import FlipCard, { nextFlipState } from './FlipCard';
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

describe('which cards flip', () => {
  const keys = ['hours', 'minutes', 'seconds'];
  // Feed each card its value second by second, as LiveFlipClock does, and report the cards that started a turn.
  function flips(...times) {
    const parts = times.map((iso) => flipParts(new Date(iso), '24'));
    const states = keys.map((key) => ({ value: parts[0][key], previous: parts[0][key], turn: 0 }));
    return parts.slice(1).map((next) => keys.filter((key, i) => {
      const after = nextFlipState(states[i], next[key]);
      const turned = after.turn !== states[i].turn;
      states[i] = after;
      return turned;
    }));
  }
  it('flips only the seconds card within a minute', () => {
    expect(flips('2026-11-06T10:15:57Z', '2026-11-06T10:15:58Z', '2026-11-06T10:15:59Z')).toEqual([['seconds'], ['seconds']]);
  });
  it('flips minutes and seconds together at :59 → :00', () => {
    expect(flips('2026-11-06T10:15:59Z', '2026-11-06T10:16:00Z')).toEqual([['minutes', 'seconds']]);
  });
  it('flips all three cards at 59:59 → 00:00 and at midnight', () => {
    expect(flips('2026-11-06T10:59:59Z', '2026-11-06T11:00:00Z')).toEqual([keys]);
    expect(flips('2026-11-06T23:59:59Z', '2026-11-07T00:00:00Z')).toEqual([keys]);
  });
  it('does not flip when the value is unchanged, and jumps in one turn after sleep', () => {
    expect(flips('2026-11-06T10:15:30Z', '2026-11-06T10:15:30Z')).toEqual([[]]);
    const state = nextFlipState({ value: '15', previous: '15', turn: 3 }, '42');
    expect(state).toEqual({ value: '42', previous: '15', turn: 4 });
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
