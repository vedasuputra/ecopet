/**
 * Opens a page of this site in the phone's / computer's real browser.
 *   computer             a new tab
 *   installed app (PWA)  on Android we ask Chrome to open it (with the same address as a fallback if Chrome is
 *                        not there); iPhones give websites no way to do this, so it opens as the system allows
 * Used for the vendor and admin dashboards, which are separate web apps and not part of the traveler app.
 */
export function openInBrowser(path: string) {
  const url = new URL(path, window.location.origin)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone && /Android/i.test(navigator.userAgent)) {
    const scheme = url.protocol.replace(':', '')
    window.location.href = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`
    return
  }
  window.open(url.href, '_blank', 'noopener')
}
