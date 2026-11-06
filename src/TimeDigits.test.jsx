import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TimeDigits from './TimeDigits';

describe('shared hour / colon / minute layout', () => {
  it.each(['08:00', '00:01', '16:59', '23:07'])('uses the same spacing classes for %s', (digits) => {
    const [hours, minutes] = digits.split(':');
    const markup = renderToStaticMarkup(<TimeDigits digits={digits} />);
    expect(markup).toBe(`<span class="time-digits" aria-hidden="true"><span class="time-hours">${hours}</span><span class="time-colon">:</span><span class="time-minutes">${minutes}</span></span>`);
  });
});
