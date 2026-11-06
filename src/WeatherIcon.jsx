import { Cloud, CloudDrizzle, CloudFog, CloudHail, CloudLightning, CloudRain, CloudSnow, CloudSun, CircleHelp, Sun } from 'lucide-react';
import { weatherIconType } from './model';

const ICONS = {
  sun: Sun, cloudSun: CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle,
  rain: CloudRain, snow: CloudSnow, thunder: CloudLightning, hail: CloudHail, unknown: CircleHelp,
};

export default function WeatherIcon({ code }) {
  const Icon = ICONS[weatherIconType(code)];
  // The adjacent localized description supplies the accessible text.
  return <Icon className="weather-icon" strokeWidth={1.8} aria-hidden="true" />;
}
