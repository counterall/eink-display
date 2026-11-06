import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRightLeft, RefreshCw, Settings as SettingsIcon, Sunrise, Sunset } from 'lucide-react';
import { CITIES, cityById, cityDate, cityName, clock, dateKey, forecastDay, fullDate, normalizeSettings, numberText, readStored, refreshSlot, sunTime, validWeather, weatherDescription, weatherUpdateSummary, writeStored } from './model';
import { fetchWeather } from './weather';
import { solarTermName } from './solarTerms';
import WeatherIcon from './WeatherIcon';
import IconButton from './IconButton';
import DigitalClock from './DigitalClock';
import WeatherChart from './WeatherChart';
import { viewportLayout } from './layout';
import '@fontsource/roboto-condensed/latin-600.css';
import './styles.css';

const TEXT = {
  zh: {
    primary: '主城市', secondary: '第二城市', today: '今天', swap: '交换城市', settings: '设置',
    sunrise: '日出', sunset: '日落', polarDay: '极昼 · 全天日照', polarNight: '极夜 · 今日无日出',
    forecast: '今日预报', rain: '降水概率', loading: '正在获取天气…', empty: '暂无天气数据',
    unavailable: '当天预报不可用', failed: '更新失败，请检查网络', stale: '缓存数据 · 可能已过期',
    updated: '更新于', refresh: '刷新天气', close: '完成', language: '语言', format: '时间格式',
    hour12: '12 小时', hour24: '24 小时', rotation: '页面方向', auto: '自动横向', none: '不旋转', cw: '顺时针 90°', ccw: '逆时针 90°',
    note: '天气按赫尔辛基时间 06:00 / 12:00 / 18:00 更新。休眠时暂停，恢复后补查。',
    lofoten: '罗弗敦群岛以斯沃尔韦尔坐标为代表。', source: '天气数据：Open-Meteo',
    forecastTemp: '预报温度', fetching: '更新中…', solarTerm: '当前节气（北京时间）',
    partialFailed: '部分更新失败', partial: '部分天气未更新', updateNote: '两地天气均至少更新至此时（主城市时间）',
    displayReference: '适配参考：Kindle 1072 × 1448（横向 1448 × 1072）',
    viewport: '浏览器视口', layout: '页面布局', pixelRatio: '像素比',
  },
  en: {
    primary: 'PRIMARY CITY', secondary: 'SECOND CITY', today: 'Today', swap: 'Swap cities', settings: 'Settings',
    sunrise: 'Sunrise', sunset: 'Sunset', polarDay: 'Polar day · sun stays up', polarNight: 'Polar night · no sunrise',
    forecast: 'TODAY’S FORECAST', rain: 'Rain chance', loading: 'Fetching weather…', empty: 'No weather data yet',
    unavailable: 'Today’s forecast unavailable', failed: 'Update failed. Check connection.', stale: 'Cached forecast · may be outdated',
    updated: 'Updated', refresh: 'Refresh weather', close: 'Done', language: 'Language', format: 'Time format',
    hour12: '12 hour', hour24: '24 hour', rotation: 'Page orientation', auto: 'Auto landscape', none: 'No rotation', cw: 'Clockwise 90°', ccw: 'Counterclockwise 90°',
    note: 'Weather updates at 06:00 / 12:00 / 18:00 Helsinki time. It catches up when the page resumes.',
    lofoten: 'Lofoten uses the coordinates of Svolvær.', source: 'Weather data: Open-Meteo',
    forecastTemp: 'Forecast temp.', fetching: 'Updating…', solarTerm: 'Current solar term (China Standard Time)',
    partialFailed: 'Some updates failed', partial: 'Some weather is unavailable', updateNote: 'Older of the two weather updates, in the primary city’s time',
    displayReference: 'Reference: Kindle 1072 × 1448 (landscape 1448 × 1072)',
    viewport: 'Browser viewport', layout: 'Page layout', pixelRatio: 'Pixel ratio',
  },
};

function useViewport(rotation) {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('orientationchange', resize); };
  }, []);
  return viewportLayout(size.width, size.height, rotation);
}

function useWeather(primary, secondary) {
  const [entries, setEntries] = useState(() => {
    const stored = readStored('kindle-weather-v1');
    const valid = {};
    if (stored && typeof stored === 'object') CITIES.forEach((city) => {
      const entry = stored[city.id];
      if (entry && validWeather(entry.data) && Number.isFinite(entry.fetchedAt) && typeof entry.slot === 'string') valid[city.id] = entry;
    });
    return valid;
  });
  const [status, setStatus] = useState({});
  const entriesRef = useRef(entries);
  const inflight = useRef({});
  const failures = useRef({});
  const mounted = useRef(false);

  const update = (force = false) => {
    [primary, secondary].forEach((id) => {
      const now = new Date();
      const cached = entriesRef.current[id];
      if (inflight.current[id]) return;
      if (!force && cached && cached.slot === refreshSlot(now)) return;
      // Back off after failure rather than making a request every clock tick.
      if (!force && failures.current[id] && now.getTime() - failures.current[id] < 15 * 60000) return;
      inflight.current[id] = true;
      setStatus((old) => ({ ...old, [id]: 'loading' }));
      fetchWeather(cityById(id)).then((entry) => {
        const next = { ...entriesRef.current, [id]: entry };
        entriesRef.current = next;
        writeStored('kindle-weather-v1', next);
        delete failures.current[id];
        if (mounted.current) { setEntries(next); setStatus((old) => ({ ...old, [id]: 'ready' })); }
      }).catch(() => {
        failures.current[id] = Date.now();
        if (mounted.current) setStatus((old) => ({ ...old, [id]: 'error' }));
      }).finally(() => { delete inflight.current[id]; });
    });
  };

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    update();
    const tick = setInterval(() => update(), 60000);
    const resume = () => { if (!document.hidden) update(); };
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [primary, secondary]);
  return { entries, status, refresh: () => update(true) };
}

function WeatherCard({ city, entry, state, now, language, t }) {
  const day = forecastDay(entry && entry.data, city, now);
  const cityNow = cityDate(city, now);
  const current = entry && entry.data.current;
  const currentIsRecent = current && now.getTime() - entry.fetchedAt < 90 * 60000;
  const point = day && day.points.find((item) => item.hour === cityNow.getUTCHours());
  const temperature = currentIsRecent ? current.temperature_2m : point && point.temperature;
  const code = currentIsRecent ? current.weather_code : day && day.code;
  return <section className="weather-card" aria-label={`${cityName(city, language)} ${t.forecast}`}>
    <div className="weather-heading"><h2>{cityName(city, language)}</h2><span className="eyebrow">{t.forecast}</span></div>
    {day ? <>
      <div className="weather-summary">
        <WeatherIcon code={code} />
        <strong>{numberText(temperature)}<span>°C</span></strong>
        <div><span>{weatherDescription(code, language)}</span><small>{numberText(day.min)}° / {numberText(day.max)}°</small></div>
      </div>
      <WeatherChart points={day.points} t={t} nowHour={cityNow.getUTCHours()} />
    </> : <div className="weather-placeholder"><span>{state === 'loading' ? t.loading : state === 'error' ? t.failed : entry ? t.unavailable : t.empty}</span><span className="placeholder-rule" /></div>}
  </section>;
}

function Settings({ settings, setSettings, close, viewport, t }) {
  const first = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    first.current.focus();
    const keydown = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if (previous && previous.focus) previous.focus(); };
  }, []);
  const change = (key, value) => setSettings((old) => {
    const next = { ...old, [key]: value };
    if (key === 'primary' && value === old.secondary) next.secondary = old.primary;
    if (key === 'secondary' && value === old.primary) next.primary = old.secondary;
    return next;
  });
  return <div className="settings-layer">
    <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title" onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const controls = event.currentTarget.querySelectorAll('button, select, a');
      const firstControl = controls[0], lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) { event.preventDefault(); lastControl.focus(); }
      else if (!event.shiftKey && document.activeElement === lastControl) { event.preventDefault(); firstControl.focus(); }
    }}>
      <header><h2 id="settings-title">{t.settings}</h2></header>
      <div className="settings-fields">
        {['primary', 'secondary'].map((key) => <label key={key}>{t[key]}<select ref={key === 'primary' ? first : undefined} value={settings[key]} onChange={(event) => change(key, event.target.value)}>{CITIES.map((city) => <option key={city.id} value={city.id}>{cityName(city, settings.language)}</option>)}</select></label>)}
        <label>{t.language}<select value={settings.language} onChange={(event) => change('language', event.target.value)}><option value="zh">中文</option><option value="en">English</option></select></label>
        <label>{t.format}<select value={settings.format} onChange={(event) => change('format', event.target.value)}><option value="24">{t.hour24}</option><option value="12">{t.hour12}</option></select></label>
        <label className="wide-field">{t.rotation}<select value={settings.rotation} onChange={(event) => change('rotation', event.target.value)}>{['auto', 'none', 'cw', 'ccw'].map((key) => <option key={key} value={key}>{t[key]}</option>)}</select></label>
      </div>
      <p>{t.note}</p><p>{t.lofoten}</p>
      <p className="display-info">{t.displayReference}<br />{t.viewport}: {Math.round(viewport.viewportWidth)} × {Math.round(viewport.viewportHeight)} CSS px · {t.layout}: {Math.round(viewport.width)} × {Math.round(viewport.height)} · {t.pixelRatio}: {window.devicePixelRatio || 1}</p>
      <footer><button className="filled-button" onClick={close}>{t.close}</button><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{t.source}</a></footer>
    </section>
  </div>;
}

function App() {
  const [settings, setSettings] = useState(() => normalizeSettings(readStored('kindle-settings-v1')));
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const viewport = useViewport(settings.rotation);
  const { entries, status, refresh } = useWeather(settings.primary, settings.secondary);
  const t = TEXT[settings.language];
  const primary = cityById(settings.primary), secondary = cityById(settings.secondary);
  const primaryDate = cityDate(primary, now), secondaryDate = cityDate(secondary, now);
  const primaryTime = clock(primaryDate, settings.format), secondaryTime = clock(secondaryDate, settings.format);
  const day = forecastDay(entries[primary.id] && entries[primary.id].data, primary, now);
  const sameDay = dateKey(primaryDate) === dateKey(secondaryDate);
  const updateSummary = weatherUpdateSummary([entries[primary.id], entries[secondary.id]], [status[primary.id], status[secondary.id]], now);
  const updatedDate = updateSummary.updatedAt === null ? null : cityDate(primary, new Date(updateSummary.updatedAt));
  const updatedTime = updatedDate ? `${dateKey(updatedDate) === dateKey(primaryDate) ? '' : `${dateKey(updatedDate)} `}${clock(updatedDate, '24').digits}` : '—';
  const updateNotice = ['ready', 'loading'].includes(updateSummary.state) ? '' : t[updateSummary.state];

  useEffect(() => {
    writeStored('kindle-settings-v1', settings);
    document.documentElement.lang = settings.language === 'zh' ? 'zh-CN' : 'en';
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

  return <main className={`stage ${viewport.width < 650 ? 'compact' : ''}`} style={viewport.style}>
    <div className="dashboard" aria-hidden={showSettings ? 'true' : undefined}>
      <section className="clock-panel">
        <header className="date-header"><span>{fullDate(primaryDate, settings.language)}</span><span className="solar-term" lang="zh-CN" title={t.solarTerm}>· {solarTermName(now)}</span></header>
        <div className="primary-clock">
          <div className="city-label"><span className="eyebrow">{t.primary}</span><h1>{cityName(primary, settings.language)}</h1></div>
          <DigitalClock city={cityName(primary, settings.language)} time={primaryTime} fontSize={Math.min(viewport.width * 0.176, viewport.height * 0.30)} />
          <div className="second-clock">
            <div className="second-city-label"><span className="eyebrow">{t.secondary}</span><span className="second-city">{cityName(secondary, settings.language)}</span></div>
            <div className="second-time-row"><strong>{secondaryTime.digits}<small>{secondaryTime.period}</small></strong><span className="second-date">{sameDay ? t.today : dateKey(secondaryDate)}</span></div>
          </div>
        </div>
        <footer className="clock-footer">
          <div className="sun-times">{day && day.daylight >= 86300 ? <span>{t.polarDay}</span> : day && day.daylight === 0 ? <span>{t.polarNight}</span> : <>
            <div><Sunrise className="sun-symbol" strokeWidth={1.8} aria-hidden="true" /><span>{t.sunrise}</span><strong>{sunTime(day && day.sunrise, settings.format)}</strong></div>
            <div><Sunset className="sun-symbol" strokeWidth={1.8} aria-hidden="true" /><span>{t.sunset}</span><strong>{sunTime(day && day.sunset, settings.format)}</strong></div>
          </>}</div>
          <div className="actions">
            <IconButton icon={ArrowRightLeft} label={t.swap} onClick={() => setSettings((old) => ({ ...old, primary: old.secondary, secondary: old.primary }))} />
            <IconButton icon={SettingsIcon} label={t.settings} onClick={() => setShowSettings(true)} />
          </div>
        </footer>
      </section>
      <aside className="weather-panel">
        <WeatherCard city={primary} entry={entries[primary.id]} state={status[primary.id]} now={now} language={settings.language} t={t} />
        <WeatherCard city={secondary} entry={entries[secondary.id]} state={status[secondary.id]} now={now} language={settings.language} t={t} />
        <footer className="weather-footer">
          <IconButton icon={RefreshCw} label={updateSummary.state === 'loading' ? t.fetching : t.refresh} onClick={refresh} busy={updateSummary.state === 'loading'} />
          <div className="weather-status" aria-live="polite"><span className="updated-time" title={t.updateNote}>{t.updated} {updatedTime}</span>{updateNotice && <small className="update-notice">{updateNotice}</small>}</div>
        </footer>
      </aside>
    </div>
    {showSettings && <Settings settings={settings} setSettings={setSettings} close={() => setShowSettings(false)} viewport={viewport} t={t} />}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
