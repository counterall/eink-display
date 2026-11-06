export default function DigitalClock({ city, time, fontSize }) {
  const [hours, minutes] = time.digits.split(':');
  return <div
    className="time-display"
    style={{ fontSize }}
    role="img"
    aria-label={`${city} ${time.digits}${time.period ? ` ${time.period}` : ''}`}
  >
    <div className="time-digits" aria-hidden="true">
      <span className="time-hours">{hours}</span>
      <span className="time-colon">:</span>
      <span className="time-minutes">{minutes}</span>
    </div>
    {time.period && <small className="time-period" aria-hidden="true">{time.period}</small>}
  </div>;
}
