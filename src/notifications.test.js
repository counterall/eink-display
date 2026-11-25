import { afterEach, describe, expect, it, vi } from 'vitest';
import { BREAK_NOTIFICATION_TAG, notificationPermission, notificationsSupported, pageInView, requestNotificationPermission, showBreakNotification } from './notifications';

afterEach(() => { vi.unstubAllGlobals(); });

function fakeNotification(permission = 'default', requestPermission) {
  const shown = [];
  function Notification(title, options) { this.title = title; this.options = options; this.closed = false; this.close = () => { this.closed = true; }; shown.push(this); }
  Notification.permission = permission;
  Notification.requestPermission = requestPermission || (() => Promise.resolve('granted'));
  return { Notification, shown };
}

describe('notification API detection', () => {
  it('is absent without a window or without Notification (Kindle)', () => {
    expect(notificationsSupported()).toBe(false);
    expect(notificationPermission()).toBe('unsupported');
    vi.stubGlobal('window', { innerWidth: 1448 });
    expect(notificationsSupported()).toBe(false);
    expect(notificationPermission()).toBe('unsupported');
  });
  it('reports the current permission when available', () => {
    vi.stubGlobal('window', { Notification: fakeNotification('denied').Notification });
    expect(notificationsSupported()).toBe(true);
    expect(notificationPermission()).toBe('denied');
  });
});

describe('requesting permission', () => {
  it('supports the promise form', async () => {
    vi.stubGlobal('window', { Notification: fakeNotification('default', () => Promise.resolve('granted')).Notification });
    const done = vi.fn();
    requestNotificationPermission(done);
    await Promise.resolve(); await Promise.resolve();
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith('granted');
  });
  it('supports the callback form (Safari 9)', () => {
    vi.stubGlobal('window', { Notification: fakeNotification('default', (callback) => { callback('denied'); return undefined; }).Notification });
    const done = vi.fn();
    requestNotificationPermission(done);
    expect(done).toHaveBeenCalledWith('denied');
  });
  it('answers only once when a browser calls back and resolves', async () => {
    vi.stubGlobal('window', { Notification: fakeNotification('default', (callback) => { callback('granted'); return Promise.resolve('granted'); }).Notification });
    const done = vi.fn();
    requestNotificationPermission(done);
    await Promise.resolve(); await Promise.resolve();
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('never throws and falls back to the current permission', async () => {
    const throwing = fakeNotification('default', () => { throw new Error('nope'); }).Notification;
    vi.stubGlobal('window', { Notification: throwing });
    const done = vi.fn();
    expect(() => requestNotificationPermission(done)).not.toThrow();
    expect(done).toHaveBeenCalledWith('default');
    const rejecting = fakeNotification('default', () => Promise.reject(new Error('nope'))).Notification;
    vi.stubGlobal('window', { Notification: rejecting });
    const later = vi.fn();
    requestNotificationPermission(later);
    await Promise.resolve(); await Promise.resolve();
    expect(later).toHaveBeenCalledWith('default');
  });
  it('reports unsupported without the API', () => {
    const done = vi.fn();
    requestNotificationPermission(done);
    expect(done).toHaveBeenCalledWith('unsupported');
  });
});

describe('showing the break notification', () => {
  it('shows one tagged notification that focuses the page and closes on click', () => {
    const { Notification, shown } = fakeNotification('granted');
    const focus = vi.fn();
    vi.stubGlobal('window', { Notification, focus });
    expect(showBreakNotification('Take a break ☕')).toBe(true);
    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe('Take a break ☕');
    expect(shown[0].options).toEqual({ tag: BREAK_NOTIFICATION_TAG });
    expect(BREAK_NOTIFICATION_TAG).toBe('kindle-break');
    shown[0].onclick();
    expect(focus).toHaveBeenCalled();
    expect(shown[0].closed).toBe(true);
  });
  it('swallows constructor errors (Android Chrome)', () => {
    function Throwing() { throw new TypeError('Illegal constructor'); }
    Throwing.permission = 'granted';
    vi.stubGlobal('window', { Notification: Throwing });
    expect(() => showBreakNotification('x')).not.toThrow();
    expect(showBreakNotification('x')).toBe(false);
  });
  it('does nothing without the API', () => {
    expect(showBreakNotification('x')).toBe(false);
  });
});

describe('page in view', () => {
  it('is in view without a document (server render)', () => {
    expect(pageInView()).toBe(true);
  });
  it('is out of view when hidden or unfocused', () => {
    vi.stubGlobal('document', { hidden: false, hasFocus: () => true });
    expect(pageInView()).toBe(true);
    vi.stubGlobal('document', { hidden: true, hasFocus: () => true });
    expect(pageInView()).toBe(false);
    vi.stubGlobal('document', { hidden: false, hasFocus: () => false });
    expect(pageInView()).toBe(false);
    vi.stubGlobal('document', { hidden: false });
    expect(pageInView()).toBe(true);
  });
});
