import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Settings as SettingsIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { THEMES, THEME_COLORS, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom, cityById, cityDate, cityName, clock, dateKey, dateParts, flipParts, normalizeSettings, readStored, toggleTheme, weatherUpdateSummary, writeStored } from './model';
import { lunarDateName, solarTermName } from './solarTerms';
import { flipTimeFontSize, primaryTimeFontSize } from './layout';
import { APP_TEXT, BREAK_TEXT, pick } from './i18n';
import useViewport from './useViewport';
import useWeather from './useWeather';
import IconButton from './IconButton';
import DigitalClock from './DigitalClock';
import FlipClock, { LiveFlipClock } from './FlipClock';
import TimeDigits from './TimeDigits';
import CityHeading from './CityHeading';
import TrendingCarousel from './TrendingFeed';
import WorkdayBlock from './WorkdayBlock';
import DisplayModeToggle from './DisplayModeToggle';
import Settings from './Settings';
import BreakDialog from './BreakDialog';
import useBreakReminder from './useBreakReminder';
import { normalizeWorkState, workStartAt } from './workday';

export const SETTINGS_KEY = 'kindle-settings-v1';
export const WORK_KEY = 'kindle-work-v1';

// Carousel slides (issue #23) sit side by side in a horizontally clipped track, and slide while
// switching: only their height counts, for every slide, so the fit allows for the taller one.
const inTrack = (node) => typeof node.closest === 'function' && node.closest('.carousel-track') !== null;

function overflows(bounds, nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const box = nodes[i].getBoundingClientRect();
    if (box.width && ((box.right > bounds.right + 1 && !inTrack(nodes[i])) || box.bottom > bounds.bottom + 1)) return true;
  }
  return false;
}

// The colored themes draw Trending (and buttons, Settings) as bordered cards: `stage--card`.
export const CARD_THEMES = THEMES.filter((theme) => theme !== 'light' && theme !== 'dark');

export function stageClass(viewport, theme) {
  const classes = ['stage', `stage--${viewport.mode}`];
  if (viewport.width < 650) classes.push('compact');
  if (CARD_THEMES.includes(theme)) classes.push('stage--card');
  if (theme !== 'light') classes.push(`theme--${theme}`);
  return classes.join(' ');
}
// The zoom actually shown: the saved zoom, capped by what fits the current layout.
export const effectiveZoom = (saved, limit) => (limit === null ? saved : Math.min(saved, limit));

export function stageOverflows(stage) {
  if (overflows(stage.getBoundingClientRect(), stage.querySelectorAll('.dashboard *'))) return true;
  // Flip cards are wider than the classic digits; keep them out of the Trending column.
  const panel = stage.querySelector('.clock-panel');
  if (panel && overflows(panel.getBoundingClientRect(), stage.querySelectorAll('.flip-clock'))) return true;
  // The second-city and work tiles sit side by side: their time must not run into the neighbour.
  const tiles = stage.querySelectorAll('.clock-tile');
  for (let i = 0; i < tiles.length; i++) {
    if (overflows(tiles[i].getBoundingClientRect(), tiles[i].querySelectorAll('.clock-tile-time'))) return true;
  }
  const card = stage.querySelector('.feeds-panel');
  const carded = CARD_THEMES.some((theme) => (` ${stage.className} `).indexOf(` theme--${theme} `) !== -1);
  return Boolean(card && carded && overflows(card.getBoundingClientRect(), stage.querySelectorAll('.feeds-panel *')));
}

export default function App() {
  const [settings, setSettings] = useState(() => normalizeSettings(readStored(SETTINGS_KEY)));
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  // Largest zoom that fit this layout; reset whenever the available space or content shape changes.
  // It caps the saved zoom without changing it, so turning a tablet to portrait and back (or any
  // other layout change) never leaves the page smaller for good.
  const [zoomLimit, setZoomLimit] = useState(null);
  const zoom = effectiveZoom(settings.zoom, zoomLimit);
  const viewport = useViewport(settings.showFeeds, zoom);
  const zoomBy = (step) => setSettings((old) => ({ ...old, zoom: clampZoom(effectiveZoom(old.zoom, zoomLimit) + step) }));
  const stageRef = useRef(null);
  const layoutKey = [viewport.width, viewport.height, viewport.mode, settings.language, settings.format, settings.theme, settings.clockStyle].join('|');
  useEffect(() => { setZoomLimit(null); }, [layoutKey]);
  // Runs before paint, so an oversized zoom is never shown (and never leaves the controls off-screen).
  useLayoutEffect(() => {
    if (zoom <= ZOOM_MIN || !stageRef.current) return;
    if (!stageOverflows(stageRef.current)) return;
    setZoomLimit(clampZoom(zoom - ZOOM_STEP));
  });
  const { entries, status } = useWeather(settings.primary, settings.secondary, now);
  const t = pick(APP_TEXT, settings.language);
  const primary = cityById(settings.primary), secondary = cityById(settings.secondary);
  // The work session starts when "Start work" is pressed and lasts 8 hours.
  const [work, setWork] = useState(() => normalizeWorkState(readStored(WORK_KEY)));
  useEffect(() => { writeStored(WORK_KEY, work); }, [work]);
  const [welcome, setWelcome] = useState(false);
  // Refresh the minute clock too: a stale `now` would predate the new session.
  const startWork = () => { const clicked = new Date(); setNow(clicked); setWork({ startedAt: workStartAt(clicked.getTime()) }); setWelcome(true); };
  const breakReminder = useBreakReminder(settings.breakReminder, work.startedAt, now, { enabled: settings.breakNotification, title: pick(BREAK_TEXT, settings.language).notification });
  const breakMode = welcome ? 'welcome' : breakReminder.mode;
  const breakOpen = !showSettings && breakMode !== null;
  const primaryDate = cityDate(primary, now), secondaryDate = cityDate(secondary, now);
  const primaryTime = clock(primaryDate, settings.format), secondaryTime = clock(secondaryDate, settings.format);
  const flip = settings.clockStyle === 'flip';
  const secondaryLabel = `${cityName(secondary, settings.language)} ${secondaryTime.digits}${secondaryTime.period ? ` ${secondaryTime.period}` : ''}`;
  const sameDay = dateKey(primaryDate) === dateKey(secondaryDate);
  const dateText = dateParts(primaryDate, settings.language);
  const updateSummary = weatherUpdateSummary([entries[primary.id], entries[secondary.id]], [status[primary.id], status[secondary.id]], now);
  const updatedDate = updateSummary.updatedAt === null ? null : cityDate(primary, new Date(updateSummary.updatedAt));
  const updatedTime = updatedDate ? `${dateKey(updatedDate) === dateKey(primaryDate) ? '' : `${dateKey(updatedDate)} `}${clock(updatedDate, '24').digits}` : '—';
  const updateNotice = updateSummary.state === 'loading' ? t.fetching : updateSummary.state === 'ready' ? '' : t[updateSummary.state];

  useEffect(() => {
    writeStored(SETTINGS_KEY, settings);
    document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : 'en';
    // Light is the unclassed base; every other theme is a theme--<name> class.
    for (const theme of THEMES) {
      if (theme !== 'light' && theme === settings.theme) document.documentElement.classList.add(`theme--${theme}`);
      else document.documentElement.classList.remove(`theme--${theme}`);
    }
    const colorMeta = document.querySelector('meta[name="theme-color"]');
    if (colorMeta) colorMeta.setAttribute('content', THEME_COLORS[settings.theme]);
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

  return <main ref={stageRef} className={stageClass(viewport, settings.theme)} style={viewport.style}>
    <div className="dashboard" aria-hidden={showSettings || breakOpen ? 'true' : undefined}>
      <section className="clock-panel">
        <header className="date-header">
          <span>{dateText.weekdayFirst ? dateText.weekday : dateText.date}</span>
          <span className="lunar-date" lang="zh-CN" title={t.lunarDate}>· {lunarDateName(primaryDate)}</span>
          <span className="date-after-lunar">· {dateText.weekdayFirst ? dateText.date : dateText.weekday}</span>
          <span className="solar-term" lang="zh-CN" title={t.solarTerm}>· {solarTermName(now)}</span>
        </header>
        <div className="primary-clock">
          <CityHeading city={primary} entry={entries[primary.id]} now={now} language={settings.language} format={settings.format} label={t.primary} primary t={t} />
          <div className="primary-time">
            {flip
              ? <LiveFlipClock city={primary} cityLabel={cityName(primary, settings.language)} format={settings.format} fontSize={flipTimeFontSize(viewport.width, viewport.height, viewport.mode, zoom)} />
              : <DigitalClock city={cityName(primary, settings.language)} time={primaryTime} fontSize={primaryTimeFontSize(viewport.width, viewport.height, viewport.mode, zoom)} />}
          </div>
        </div>
        <div className="clock-tiles">
          <div className="second-clock clock-tile">
            <CityHeading city={secondary} entry={entries[secondary.id]} now={now} language={settings.language} format={settings.format} label={t.secondary} stacked t={t} />
            <div className="second-time-row">
              {flip
                ? <FlipClock className="flip-clock--second clock-tile-time" label={secondaryLabel} parts={flipParts(secondaryDate, settings.format)} />
                : <strong className="clock-tile-time" role="img" aria-label={secondaryLabel}>
                  <TimeDigits digits={secondaryTime.digits} />
                  {secondaryTime.period && <small aria-hidden="true">{secondaryTime.period}</small>}
                </strong>}
              {/* A different calendar day shows the date as two short lines (year / MM-DD) so it fits beside the cards in the half-width tile. */}
              <span className="second-date">{sameDay ? t.today : <><span>{dateKey(secondaryDate).slice(0, 4)}</span><span>{dateKey(secondaryDate).slice(5)}</span></>}</span>
            </div>
          </div>
          <WorkdayBlock city={primary} now={now} language={settings.language} startedAt={work.startedAt} onStart={startWork} clockStyle={settings.clockStyle} />
        </div>
        <footer className="clock-footer">
          <div className="actions">
            <IconButton icon={ArrowRightLeft} label={t.swap} onClick={() => setSettings((old) => ({ ...old, primary: old.secondary, secondary: old.primary }))} />
            <IconButton icon={SettingsIcon} label={t.settings} onClick={() => setShowSettings(true)} />
            <IconButton icon={ZoomOut} label={t.zoomOut} title={`${t.zoomOut} · ${zoom}%`} disabled={zoom <= ZOOM_MIN} onClick={() => zoomBy(-ZOOM_STEP)} />
            <IconButton icon={ZoomIn} label={t.zoomIn} title={`${t.zoomIn} · ${zoom}%`} disabled={zoom >= Math.min(ZOOM_MAX, zoomLimit === null ? ZOOM_MAX : zoomLimit)} onClick={() => zoomBy(ZOOM_STEP)} />
            <div className="weather-status" aria-live="polite"><span className="updated-time" title={t.updateNote}>{t.updated} {updatedTime}</span>{updateNotice && <small className="update-notice">{updateNotice}</small>}</div>
          </div>
        </footer>
      </section>
      {settings.showFeeds && <aside className="feeds-panel" aria-label={t.feedsArea}><TrendingCarousel language={settings.language} city={primary} now={now} interval={settings.carouselInterval} paused={showSettings || breakOpen} /></aside>}
    </div>
    {!showSettings && !breakOpen && <DisplayModeToggle theme={settings.theme} language={settings.language} onToggle={() => setSettings(toggleTheme)} />}
    {showSettings && <Settings settings={settings} setSettings={setSettings} close={(options) => { setShowSettings(false); if (options && options.breakNow) breakReminder.openNow(); }} viewport={viewport} t={t} />}
    {breakOpen && <BreakDialog mode={breakMode} minutesLeft={breakReminder.minutesLeft} elapsed={breakReminder.elapsed} language={settings.language} onDismiss={() => { if (welcome) setWelcome(false); breakReminder.dismiss(); }} onStart={breakReminder.start} />}
  </main>;
}
