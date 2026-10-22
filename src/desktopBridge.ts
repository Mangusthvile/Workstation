/**
 * Only active when the page is served by the desktop launcher (Workstation.exe),
 * which marks index.html with <meta name="workstation-desktop">. The page checks
 * in periodically and says goodbye when its window closes, so the launcher can
 * quit by itself once the last window is gone. In the hosted web version this
 * does nothing.
 */
const PING_MS = 20_000;

export function startDesktopBridge() {
  if (!document.querySelector('meta[name="workstation-desktop"]')) return;

  const id = crypto.randomUUID();
  const ping = () => fetch(`/api/desktop/ping?id=${id}`, { method: 'POST', keepalive: true }).catch(() => {});

  ping();
  setInterval(ping, PING_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ping();
  });
  window.addEventListener('pagehide', () => navigator.sendBeacon(`/api/desktop/bye?id=${id}`));
}
