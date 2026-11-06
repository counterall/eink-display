import { forecastTimeline, numberText, pad } from './model';

export default function WeatherChart({ points, t, nowHour }) {
  const timeline = forecastTimeline(points, nowHour);
  const valid = timeline.points.filter((point) => typeof point.temperature === 'number' && Number.isFinite(point.temperature));
  if (!valid.length) return <div className="chart-empty">{t.unavailable}</div>;
  const min = Math.floor(Math.min(...valid.map((point) => point.temperature)) / 5) * 5;
  const max = Math.max(min + 5, Math.ceil(Math.max(...valid.map((point) => point.temperature)) / 5) * 5);
  const x = (index) => timeline.points.length === 1 ? 158 : 28 + index / (timeline.points.length - 1) * 260;
  const y = (temperature) => 65 - (temperature - min) / (max - min) * 47;
  const lines = [];
  let segment = [];
  timeline.points.forEach((point) => {
    if (typeof point.temperature === 'number' && Number.isFinite(point.temperature)) segment.push(point);
    else if (segment.length) { lines.push(segment); segment = []; }
  });
  if (segment.length) lines.push(segment);
  const current = valid.find((point) => point.hour === nowHour);
  const range = `${pad(timeline.points[0].hour)}:00–${pad(timeline.points[timeline.points.length - 1].hour)}:00`;
  return <div className="chart-wrap">
    <svg className="weather-chart" viewBox="0 0 306 91" role="img" aria-label={`${t.forecastTemp}: ${range}, ${min}–${max}°C`}>
      {[min, max].map((value) => <g key={value}>
        <line x1="28" y1={y(value)} x2="288" y2={y(value)} stroke="#d3d3d3" />
        <text x="0" y={y(value) + 4}>{value}°</text>
      </g>)}
      {timeline.ticks.map((point) => <g key={point.index}>
        <line x1={x(point.index)} y1="18" x2={x(point.index)} y2="68" stroke="#e4e4e4" />
        <text className="hour-tick" x={x(point.index)} y="86" textAnchor="middle">{pad(point.hour)}</text>
      </g>)}
      {lines.map((line, i) => line.length === 1
        ? <circle key={i} cx={x(line[0].index)} cy={y(line[0].temperature)} r="3.8" fill="#111" />
        : <polyline key={i} points={line.map((point) => `${x(point.index)},${y(point.temperature)}`).join(' ')} fill="none" stroke="#111" strokeWidth="2.6" strokeLinejoin="round" />)}
      {current && <circle cx={x(current.index)} cy={y(current.temperature)} r="3.8" fill="#111" />}
    </svg>
    <div className="rain-row"><span>{t.rain}</span>{timeline.ticks.map((point) =>
      <span key={point.index} style={{ left: `${x(point.index) / 306 * 100}%` }}>{typeof point.rain === 'number' && Number.isFinite(point.rain) ? `${numberText(point.rain)}%` : '—'}</span>
    )}</div>
  </div>;
}
