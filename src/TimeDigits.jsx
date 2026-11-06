export default function TimeDigits({ digits }) {
  const [hours, minutes] = digits.split(':');
  return <span className="time-digits" aria-hidden="true">
    <span className="time-hours">{hours}</span>
    <span className="time-colon">:</span>
    <span className="time-minutes">{minutes}</span>
  </span>;
}
