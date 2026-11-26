import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CITIES, CLOCK_STYLES, THEMES, cityName, withTheme } from './model';
import { CAROUSEL_INTERVALS } from './carousel';
import { notificationPermission, notificationsSupported, requestNotificationPermission } from './notifications';

export default function Settings({ settings, setSettings, close, viewport, t }) {
  const first = useRef(null);
  // "Now" is a one-off test choice: it enables the reminder and asks for a prompt on close.
  const [breakNow, setBreakNow] = useState(false);
  const breakNowRef = useRef(false);
  breakNowRef.current = breakNow;
  const finish = () => close({ breakNow: breakNowRef.current });
  // The row is absent where there is no Notification API (e.g. iOS Safari outside a home-screen app).
  const [permission, setPermission] = useState(notificationPermission);
  const notifyOn = settings.breakNotification && permission === 'granted';
  const changeNotification = (on) => {
    if (!on || permission === 'granted') { change('breakNotification', on); return; }
    // Asked from this user gesture; the setting only turns on once granted.
    requestNotificationPermission((result) => { setPermission(result); change('breakNotification', result === 'granted'); });
  };
  useEffect(() => {
    const previous = document.activeElement;
    first.current.focus();
    const keydown = (event) => { if (event.key === 'Escape') finish(); };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if (previous && previous.focus) previous.focus(); };
  }, []);
  const change = (key, value) => setSettings((old) => {
    if (key === 'theme') return withTheme(old, value);
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
      <header><h2 id="settings-title">{t.settings}</h2><button type="button" className="break-close settings-close" aria-label={t.closeDialog} title={t.closeDialog} onClick={finish}><X strokeWidth={1.8} aria-hidden="true" /></button></header>
      <div className="settings-fields">
        {['primary', 'secondary'].map((key) => <label key={key}>{t[key]}<select ref={key === 'primary' ? first : undefined} value={settings[key]} onChange={(event) => change(key, event.target.value)}>{CITIES.map((city) => <option key={city.id} value={city.id}>{cityName(city, settings.language)}</option>)}</select></label>)}
        <label>{t.language}<select value={settings.language} onChange={(event) => change('language', event.target.value)}><option value="zh">中文</option><option value="en">English</option></select></label>
        <label>{t.format}<select value={settings.format} onChange={(event) => change('format', event.target.value)}><option value="24">{t.hour24}</option><option value="12">{t.hour12}</option></select></label>
        <label>{t.rightColumn}<select value={settings.showFeeds ? 'show' : 'hide'} onChange={(event) => change('showFeeds', event.target.value === 'show')}><option value="show">{t.show}</option><option value="hide">{t.hide}</option></select></label>
        {settings.showFeeds && <label>{t.carouselInterval}<select value={settings.carouselInterval} onChange={(event) => change('carouselInterval', Number(event.target.value))}>{CAROUSEL_INTERVALS.map((minutes) => <option key={minutes} value={minutes}>{t[`interval_${minutes}`]}</option>)}</select></label>}
        <label>{t.theme}<select value={settings.theme} onChange={(event) => change('theme', event.target.value)}>{THEMES.map((key) => <option key={key} value={key}>{t[`theme_${key}`]}</option>)}</select></label>
        <label>{t.clockStyle}<select value={settings.clockStyle} onChange={(event) => change('clockStyle', event.target.value)}>{CLOCK_STYLES.map((key) => <option key={key} value={key}>{t[`clock_${key}`]}</option>)}</select></label>
        <label>{t.breakReminder}<select value={breakNow ? 'now' : settings.breakReminder ? 'on' : 'off'} onChange={(event) => { const value = event.target.value; setBreakNow(value === 'now'); change('breakReminder', value !== 'off'); }}><option value="off">{t.off}</option><option value="on">{t.on}</option><option value="now">{t.breakNow}</option></select></label>
        {settings.breakReminder && notificationsSupported() && <label>{t.breakNotification}<select value={notifyOn ? 'on' : 'off'} onChange={(event) => changeNotification(event.target.value === 'on')}><option value="off">{t.off}</option><option value="on">{t.on}</option></select></label>}
        {settings.breakReminder && permission === 'denied' && <p className="settings-hint">{t.notificationBlocked}</p>}
      </div>
      <p>{t.note}</p><p>{t.lofoten}</p>
      <p className="display-info">{t.viewport}: {Math.round(viewport.width)} × {Math.round(viewport.height)} CSS px · {t.pixelRatio}: {window.devicePixelRatio || 1}</p>
      <footer><button className="filled-button" onClick={finish}>{t.close}</button><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">{t.source}</a></footer>
    </section>
  </div>;
}
