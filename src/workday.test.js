import { describe, expect, it } from 'vitest';
import { cityById } from './model';
import { normalizeWorkState, workActive, workdayState, workEndAt, workStartAt } from './workday';

const helsinki = cityById('helsinki');
const ms = (iso) => new Date(iso).getTime();
const state = (iso, startedIso, city = helsinki) => workdayState(city, new Date(iso), startedIso ? ms(startedIso) : null);

describe('work session started with the "Start work" button', () => {
  it('floors the start to the minute and ends eight hours later', () => {
    expect(workStartAt(ms('2026-11-06T08:23:41.500Z'))).toBe(ms('2026-11-06T08:23:00Z'));
    expect(workEndAt(ms('2026-11-06T08:23:00Z'))).toBe(ms('2026-11-06T16:23:00Z'));
  });
  it('shows the start button on a weekday until work is started, at any hour', () => {
    expect(state('2026-11-06T05:00Z')).toEqual({ type: 'idle' }); // 07:00, before the old 09:00
    expect(state('2026-11-06T10:30Z')).toEqual({ type: 'idle' });
    expect(state('2026-11-06T18:00Z')).toEqual({ type: 'idle' }); // 20:00, after the old 17:00
  });
  it.each([
    ['2026-11-06T08:23:00Z', { type: 'working', hours: 8, minutes: 0 }],
    ['2026-11-06T08:23:59Z', { type: 'working', hours: 8, minutes: 0 }],
    ['2026-11-06T08:24:00Z', { type: 'working', hours: 7, minutes: 59 }],
    ['2026-11-06T12:53:10Z', { type: 'working', hours: 3, minutes: 30 }],
    ['2026-11-06T16:22:59Z', { type: 'working', hours: 0, minutes: 1 }],
    ['2026-11-06T16:23:00Z', { type: 'rest' }],
    ['2026-11-06T21:59:00Z', { type: 'rest' }], // 23:59 Helsinki, same day
  ])('counts down eight hours from the click at %s', (iso, expected) => {
    expect(state(iso, '2026-11-06T08:23:00Z')).toEqual(expected);
  });
  it('offers the button again on the next weekday', () => {
    expect(state('2026-11-09T06:00Z', '2026-11-06T08:23:00Z')).toEqual({ type: 'idle' });
    expect(state('2026-11-06T22:00Z', '2026-11-05T08:00:00Z')).toEqual({ type: 'weekend' }); // Sat 00:00 Helsinki
  });
  it.each(['2026-11-07T00:00Z', '2026-11-07T12:00Z', '2026-11-08T21:59Z'])('shows the weekend message all weekend at %s', (iso) => {
    expect(state(iso)).toEqual({ type: 'weekend' });
  });
  it('keeps counting down across midnight, even into the weekend', () => {
    expect(state('2026-11-06T23:00Z', '2026-11-06T18:00Z')).toEqual({ type: 'working', hours: 3, minutes: 0 });
  });
  it('judges "today" by the primary city calendar, not UTC or the device', () => {
    // 21:30 UTC Thursday is 23:30 Thursday in Helsinki but Friday 05:30 in Xi’an.
    const startedAt = '2026-11-05T21:30Z';
    expect(state('2026-11-06T08:00Z', startedAt, cityById('xian'))).toEqual({ type: 'rest' });
    expect(state('2026-11-06T08:00Z', startedAt, helsinki)).toEqual({ type: 'idle' }); // started Thursday in Helsinki
  });
  it('is active only between the start and the end', () => {
    const startedAt = ms('2026-11-06T08:00Z');
    expect(workActive(null, startedAt)).toBe(false);
    expect(workActive(startedAt, startedAt - 1)).toBe(false);
    expect(workActive(startedAt, startedAt)).toBe(true);
    expect(workActive(startedAt, workEndAt(startedAt))).toBe(false);
  });
  it('recovers from missing or corrupt saved state', () => {
    expect(normalizeWorkState(null)).toEqual({ startedAt: null });
    expect(normalizeWorkState({ startedAt: 'today' })).toEqual({ startedAt: null });
    expect(normalizeWorkState({ startedAt: ms('2026-11-06T08:00:30Z') })).toEqual({ startedAt: ms('2026-11-06T08:00Z') });
  });
});
