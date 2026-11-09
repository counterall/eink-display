import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Settings as SettingsIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom, cityById, cityDate, cityName, clock, dateKey, dateParts, normalizeSettings, readStored, weatherUpdateSummary, writeStored } from './model';
import { lunarDateName, solarTermName } from './solarTerms';
import { primaryTimeFontSize } from './layout';
import { APP_TEXT, pick } from './i18n';
import useViewport from './useViewport';
import useWeather from './useWeather';
import IconButton from './IconButton';
import DigitalClock from './DigitalClock';
import TimeDigits from './TimeDigits';
import CityHeading from './CityHeading';
import TrendingFeed from './TrendingFeed';
import WorkdayBlock from './WorkdayBlock';
import DisplayModeToggle from './DisplayModeToggle';
import Settings from './Settings';

export const SETTINGS_KEY = 'kindle-settings-v1';

export function stageOverflows(stage) {
  const bounds = stage.getBoundingClientRect();
  const nodes = stage.querySelectorAll('.dashboard *');
  for (let i = 0; i < nodes.length; i++) {
    const box = nodes[i].getBoundingClientRect();
    if (box.width && (box.right > bounds.right + 1 || box.bottom > bounds.bottom + 1)) return true;
  }
  return false;
}

export default function App() {
  const [settings, setSettings] = useState(() => normalizeSettings(readStored(SETTINGS_KEY)));
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const viewport = useViewport(settings.rotation, settings.showFeeds, settings.zoom);
  const zoomBy = (step) => setSettings((old) => ({ ...old, zoom: clampZoom(old.zoom + step) }));
  // Largest zoom that fit this layout; reset whenever the available space or content shape changes.
  const [zoomLimit, setZoomLimit] = useState(null);
  const stageRef = useRef(null);
  const layoutKey = [viewport.width, viewport.height, settings.showFeeds, settings.language, settings.format].join('|');
  useEffect(() => { setZoomLimit(null); }, [layoutKey]);
  // Runs before paint, so an oversized zoom is never shown (and never leaves the controls off-screen).
  useLayoutEffect(() => {
    if (settings.zoom <= ZOOM_MIN || !stageRef.current) return;
    if (!stageOverflows(stageRef.current)) return;
    const fitted = clampZoom(settings.zoom - ZOOM_STEP);
    setZoomLimit(fitted);
    setSettings((old) => ({ ...old, zoom: Math.min(old.zoom, fitted) }));
  });
  const { entries, status } = useWeather(settings.primary, settings.secondary, now);
  const t = pick(APP_TEXT, settings.language);
  const primary = cityById(settings.primary), secondary = cityById(settings.secondary);
  const primaryDate = cityDate(primary, now), secondaryDate = cityDate(secondary, now);
  const primaryTime = clock(primaryDate, settings.format), secondaryTime = clock(secondaryDate, settings.format);
  const sameDay = dateKey(primaryDate) === dateKey(secondaryDate);
  const dateText = dateParts(primaryDate, settings.language);
  const updateSummary = weatherUpdateSummary([entries[primary.id], entries[secondary.id]], [status[primary.id], status[secondary.id]], now);
  const updatedDate = updateSummary.updatedAt === null ? null : cityDate(primary, new Date(updateSummary.updatedAt));
  const updatedTime = updatedDate ? `${dateKey(updatedDate) === dateKey(primaryDate) ? '' : `${dateKey(updatedDate)} `}${clock(updatedDate, '24').digits}` : '—';
  const updateNotice = updateSummary.state === 'loading' ? t.fetching : updateSummary.state === 'ready' ? '' : t[updateSummary.state];

  useEffect(() => {
    writeStored(SETTINGS_KEY, settings);
    document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : 'en';
    const dark = settings.theme === 'dark';
    if (dark) document.documentElement.classList.add('theme--dark');
    else document.documentElement.classList.remove('theme--dark');
    const colorMeta = document.querySelector('meta[name="theme-color"]');
    if (colorMeta) colorMeta.setAttribute('content', dark ? '#000000' : '#ffffff');
  }, [settings]);
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      clearTimeout(timer);
      timer = setTimeout(tick, 60000 - Date.now() % 60000 + 50);
    };
    const resume = () => { if (!document.hidden) tick(); };
    tick();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); };
  }, []);

  return <main ref={stageRef} className={`stage ${viewport.width < 650 ? 'compact' : ''} ${settings.showFeeds ? '' : 'stage--fullscreen'} ${settings.theme === 'dark' ? 'theme--dark' : ''}`} style={viewport.style}>
    <div className="dashboard" aria-hidden={showSettings ? 'true' : undefined}>
      <section className="clock-panel">
        <header className="date-header">
          <span>{dateText.weekdayFirst ? dateText.weekday : dateText.date}</span>
          <span className="lunar-date" lang="zh-CN" title={t.lunarDate}>· {lunarDateName(primaryDate)}</span>
          <span className="date-after-lunar">· {dateText.weekdayFirst ? dateText.date : dateText.weekday}</span>
          <span className="solar-term" lang="zh-CN" title={t.solarTerm}>· {solarTermName(now)}</span>
        </header>
        <div className="primary-clock">
          <CityHeading city={primary} entry={entries[primary.id]} now={now} language={settings.language} format={settings.format} label={t.primary} primary t={t} />
          <DigitalClock city={cityName(primary, settings.language)} time={primaryTime} fontSize={primaryTimeFontSize(viewport.width, viewport.height, settings.showFeeds, settings.zoom)} />
          <div className="second-clock">
            <CityHeading city={secondary} entry={entries[secondary.id]} now={now} language={settings.language} format={settings.format} label={t.secondary} t={t} />
            <div className="second-time-row">
              <strong role="img" aria-label={`${cityName(secondary, settings.language)} ${secondaryTime.digits}${secondaryTime.period ? ` ${secondaryTime.period}` : ''}`}>
                <TimeDigits digits={secondaryTime.digits} />
                {secondaryTime.period && <small aria-hidden="true">{secondaryTime.period}</small>}
              </strong>
              <span className="second-date">{sameDay ? t.today : dateKey(secondaryDate)}</span>
            </div>
          </div>
          <WorkdayBlock city={primary} now={now} language={settings.language} />
        </div>
        <footer className="clock-footer">
          <div className="actions">
            <IconButton icon={ArrowRightLeft} label={t.swap} onClick={() => setSettings((old) => ({ ...old, primary: old.secondary, secondary: old.primary }))} />
            <IconButton icon={SettingsIcon} label={t.settings} onClick={() => setShowSettings(true)} />
            <IconButton icon={ZoomOut} label={t.zoomOut} title={`${t.zoomOut} · ${settings.zoom}%`} disabled={settings.zoom <= ZOOM_MIN} onClick={() => zoomBy(-ZOOM_STEP)} />
            <IconButton icon={ZoomIn} label={t.zoomIn} title={`${t.zoomIn} · ${settings.zoom}%`} disabled={settings.zoom >= Math.min(ZOOM_MAX, zoomLimit === null ? ZOOM_MAX : zoomLimit)} onClick={() => zoomBy(ZOOM_STEP)} />
            <div className="weather-status" aria-live="polite"><span className="updated-time" title={t.updateNote}>{t.updated} {updatedTime}</span>{updateNotice && <small className="update-notice">{updateNotice}</small>}</div>
          </div>
        </footer>
      </section>
      {settings.showFeeds && <aside className="feeds-panel" aria-label={t.feedsArea}><TrendingFeed language={settings.language} city={primary} now={now} /></aside>}
    </div>
    {!showSettings && <DisplayModeToggle theme={settings.theme} language={settings.language} onToggle={() => setSettings((old) => ({ ...old, theme: old.theme === 'dark' ? 'light' : 'dark' }))} />}
    {showSettings && <Settings settings={settings} setSettings={setSettings} close={() => setShowSettings(false)} viewport={viewport} t={t} />}
  </main>;
}
