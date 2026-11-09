import { useEffect, useRef, useState } from 'react';
import { CITIES, cityName } from './model';

export default function Settings({ settings, setSettings, close, viewport, t }) {
  const first = useRef(null);
  // "Now" is a one-off test choice: it enables the reminder and asks for a prompt on close.
  const [breakNow, setBreakNow] = useState(false);
  const breakNowRef = useRef(false);
  breakNowRef.current = breakNow;
  const finish = () => close({ breakNow: breakNowRef.current });
  useEffect(() => {
    const previous = document.activeElement;
    first.current.focus();
    const keydown = (event) => { if (event.key === 'Escape') finish(); };
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
        <label>{t.rotation}<select value={settings.rotation} onChange={(event) => change('rotation', event.target.value)}>{['auto', 'none', 'cw', 'ccw'].map((key) => <option key={key} value={key}>{t[key]}</option>)}</select></label>
        <label>{t.rightColumn}<select value={settings.showFeeds ? 'show' : 'hide'} onChange={(event) => change('showFeeds', event.target.value === 'show')}><option value="show">{t.show}</option><option value="hide">{t.hide}</option></select></label>
        <label>{t.breakReminder}<select value={breakNow ? 'now' : settings.breakReminder ? 'on' : 'off'} onChange={(event) => { const value = event.target.value; setBreakNow(value === 'now'); change('breakReminder', value !== 'off'); }}><option value="off">{t.off}</option><option value="on">{t.on}</option><option value="now">{t.breakNow}</option></select></label>
      </div>
      <p>{t.note}</p><p>{t.lofoten}</p>
      <p className="display-info">{t.displayReference}<br />{t.viewport}: {Math.round(viewport.viewportWidth)} × {Math.round(viewport.viewportHeight)} CSS px · {t.layout}: {Math.round(viewport.width)} × {Math.round(viewport.height)} · {t.pixelRatio}: {window.devicePixelRatio || 1}</p>
      <footer><button className="filled-button" onClick={finish}>{t.close}</button><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{t.source}</a></footer>
    </section>
  </div>;
}
