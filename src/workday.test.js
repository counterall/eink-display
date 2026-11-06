import { describe, expect, it } from 'vitest';
import { cityById, cityDate } from './model';
import { workdayState } from './workday';

describe('09:00–17:00 weekday countdown', () => {
  it.each([
    ['08:59:59', { type: 'rest' }],
    ['09:00:00', { type: 'working', hours: 8, minutes: 0 }],
    ['09:00:00.050', { type: 'working', hours: 8, minutes: 0 }],
    ['09:00:59', { type: 'working', hours: 8, minutes: 0 }],
    ['09:01:00', { type: 'working', hours: 7, minutes: 59 }],
    ['12:30:00', { type: 'working', hours: 4, minutes: 30 }],
    ['16:59:59', { type: 'working', hours: 0, minutes: 1 }],
    ['17:00:00', { type: 'rest' }],
    ['23:59:59', { type: 'rest' }],
  ])('handles the Friday boundary at %s', (time, expected) => {
    expect(workdayState(new Date(`2026-11-06T${time}Z`))).toEqual(expected);
  });
  it.each(['2026-11-07T00:00Z', '2026-11-07T12:00Z', '2026-11-08T23:59Z'])('gives weekend priority all day at %s', (date) => {
    expect(workdayState(new Date(date))).toEqual({ type: 'weekend' });
  });
  it('resumes normal weekday logic on Monday', () => {
    expect(workdayState(new Date('2026-11-09T08:00Z'))).toEqual({ type: 'rest' });
    expect(workdayState(new Date('2026-11-09T09:00Z'))).toEqual({ type: 'working', hours: 8, minutes: 0 });
  });
  it('uses the primary city timezone instead of the device timezone', () => {
    const now = new Date('2026-11-06T08:00Z');
    expect(workdayState(cityDate(cityById('helsinki'), now))).toEqual({ type: 'working', hours: 7, minutes: 0 });
    expect(workdayState(cityDate(cityById('xian'), now))).toEqual({ type: 'working', hours: 1, minutes: 0 });
  });
  it('handles local weekend rollover before UTC midnight', () => {
    expect(workdayState(cityDate(cityById('helsinki'), new Date('2026-11-06T22:00Z')))).toEqual({ type: 'weekend' });
  });
  it('follows daylight saving time when converting the primary city clock', () => {
    expect(workdayState(cityDate(cityById('helsinki'), new Date('2026-07-06T06:00Z')))).toEqual({ type: 'working', hours: 8, minutes: 0 });
  });
});
