import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { cityName, currentWeather, forecastDay, numberText, sunTime, weatherDescription } from './model';
import WeatherIcon from './WeatherIcon';

function SunEvent({ icon: Icon, label, value }) {
  const [digits, period] = value.split(' ');
  return <span className="sun-event" title={label} aria-label={`${label} ${value}`}>
    <Icon className="sun-symbol" strokeWidth={1.8} aria-hidden="true" />
    <span className="sun-time">{digits}{period && <small className="sun-period">{period}</small>}</span>
  </span>;
}

export default function CityHeading({ city, entry, now, language, format, label, primary = false, t }) {
  const day = forecastDay(entry && entry.data, city, now);
  const current = currentWeather(entry && entry.data);
  const Heading = primary ? 'h1' : 'h2';
  const polarDay = day && day.daylight >= 86300;
  const polarNight = day && day.daylight === 0;
  const PolarIcon = polarDay ? Sun : Moon;
  const polarLabel = polarDay ? t.polarDay : t.polarNight;
  const code = current ? current.weather_code : day && day.code;
  const weatherLabel = day ? `${t.current}: ${numberText(current && current.temperature_2m)}°C, ${weatherDescription(code, language)}; ${t.forecast}: ${numberText(day.min)}–${numberText(day.max)}°C` : t.empty;

  return <div className="city-heading">
    <span className="eyebrow">{label}</span>
    <div className="city-heading-row">
      <Heading className="city-name">{cityName(city, language)}</Heading>
      <div className="city-sun">
        {polarDay || polarNight ? <span className="polar-event" title={polarLabel} aria-label={polarLabel}>
          <PolarIcon className="sun-symbol" strokeWidth={1.8} aria-hidden="true" /><span>24h</span>
        </span> : <>
          <SunEvent icon={Sunrise} label={t.sunrise} value={sunTime(day && day.sunrise, format)} />
          <SunEvent icon={Sunset} label={t.sunset} value={sunTime(day && day.sunset, format)} />
        </>}
      </div>
      <div className="city-weather" title={weatherLabel} aria-label={weatherLabel}>
        <WeatherIcon code={code} />
        <div className="city-temperatures">
          <strong className="current-temperature">{numberText(current && current.temperature_2m)}<span>°C</span></strong>
          <small className="daily-temperature-range">{numberText(day && day.min)}–{numberText(day && day.max)}°C</small>
        </div>
      </div>
    </div>
  </div>;
}
