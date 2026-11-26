// Desktop browser notifications for the break reminder. Every access is
// guarded: some browsers have no Notification API (e.g. iOS Safari outside a
// home-screen app, where the feature is simply absent), Node tests have no
// window, and some browsers throw (Android Chrome on `new Notification`).
// Nothing here may break the page.

export const BREAK_NOTIFICATION_TAG = 'kindle-break';

const api = () => (typeof window !== 'undefined' && window && 'Notification' in window ? window.Notification : null);

export const notificationsSupported = () => api() !== null;

// 'granted' | 'denied' | 'default', or 'unsupported' without the API.
export function notificationPermission() {
  const Notification = api();
  if (!Notification) return 'unsupported';
  try { return Notification.permission || 'default'; } catch { return 'default'; }
}

// Must be called from a user gesture; `done` is called exactly once with the result.
export function requestNotificationPermission(done) {
  let answered = false;
  const finish = (permission) => {
    if (answered) return;
    answered = true;
    done(typeof permission === 'string' ? permission : notificationPermission());
  };
  const Notification = api();
  if (!Notification) { finish('unsupported'); return; }
  try {
    Notification.requestPermission().then(finish, () => finish(notificationPermission()));
  } catch {
    finish(notificationPermission());
  }
}

// Shows the notification; clicking it brings the dashboard forward. Returns
// whether one was shown.
export function showBreakNotification(title) {
  const Notification = api();
  if (!Notification) return false;
  try {
    const notification = new Notification(title, { tag: BREAK_NOTIFICATION_TAG });
    notification.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      try { notification.close(); } catch { /* ignore */ }
    };
    return true;
  } catch {
    return false;
  }
}

// On Linux, Chrome and Firefox often keep `hidden` false for a window on another
// workspace or covered by another app, so focus counts too.
export function pageInView() {
  if (typeof document === 'undefined' || !document) return true;
  if (document.hidden) return false;
  try { return typeof document.hasFocus !== 'function' || document.hasFocus(); } catch { return true; }
}
