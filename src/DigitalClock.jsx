import TimeDigits from './TimeDigits';

export default function DigitalClock({ city, time, fontSize }) {
  return <div
    className="time-display"
    style={{ fontSize }}
    role="img"
    aria-label={`${city} ${time.digits}${time.period ? ` ${time.period}` : ''}`}
  >
    <TimeDigits digits={time.digits} />
    {time.period && <small className="time-period" aria-hidden="true">{time.period}</small>}
  </div>;
}
