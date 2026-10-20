import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import './adblock.css'

// Ads pay for the coins and coupons, so the app asks travelers to turn off their ad blocker.
// Two checks: a "bait" element that blockers hide, and requests to the ad scripts the app itself uses (a blocker cancels them).
// Being offline is not treated as a blocker.
// Blockers cancel these (uBlock Origin also swaps some of them for a harmless stub, which a plain fetch cannot tell apart,
// so every script is loaded the way a page loads it: with a script tag, where a cancelled request is an error).
const AD_SCRIPTS = [
  'https://static.doubleclick.net/instream/ad_status.js',
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
  'https://securepubads.g.doubleclick.net/tag/js/gpt.js',
  'https://imasdk.googleapis.com/js/sdkloader/ima3.js',
  'https://c.amazon-adsystem.com/aax2/apstag.js',
]

// true if the script loaded, false if it was blocked (an error); a script that is just slow counts as loaded
function scriptLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement('script')
    const done = (ok: boolean) => {
      clearTimeout(timer)
      el.remove()
      resolve(ok)
    }
    const timer = setTimeout(() => done(true), 5000)
    el.async = true
    el.onload = () => done(true)
    el.onerror = () => done(false)
    el.src = url
    document.head.appendChild(el)
  })
}

async function adblockPresent(): Promise<boolean> {
  const bait = document.createElement('div')
  bait.id = 'ad_unit'
  bait.className = 'adsbox ad-banner ads ad advert adsbygoogle ad-placement pub_300x250 text-ad textAd banner_ad'
  bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:10px;height:10px'
  bait.innerHTML = '&nbsp;'
  document.body.appendChild(bait)
  await new Promise((r) => setTimeout(r, 200))
  const cs = getComputedStyle(bait)
  const hidden = bait.offsetHeight === 0 || cs.display === 'none' || cs.visibility === 'hidden'
  bait.remove()
  if (hidden) return true
  if (!navigator.onLine) return false
  // any of the ad scripts being cancelled counts
  const results = await Promise.all(AD_SCRIPTS.map(scriptLoads))
  if (results.every(Boolean)) return false
  // blocked by an extension, or the network failed: confirm the network works before blaming the blocker
  try {
    await fetch(window.location.origin + '/favicon.png', { cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

// While you test the design, open the app with ?adblock in the address to see this popup without an ad blocker.
const PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('adblock')

// The popup that asks to turn the ad blocker off. It cannot be closed (the app is behind it, dimmed) until the check passes.
export default function AdblockGate({ children }: { children: ReactNode }) {
  const t = useT()
  const [blocked, setBlocked] = useState(PREVIEW)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    if (PREVIEW) return
    setChecking(true)
    setBlocked(await adblockPresent())
    setChecking(false)
  }
  useEffect(() => {
    void check()
    // checked again when you come back to the app (e.g. after turning the blocker on or off)
    const again = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', again)
    window.addEventListener('focus', again)
    return () => {
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('focus', again)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {children}
      {blocked && (
        <div className="popup-backdrop adb-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="adb-title" aria-describedby="adb-body">
          <div className="popup-card adb-card">
            <div className="adb-main">
              <span className="adb-icon" aria-hidden="true">
                <span className="mi">block</span>
              </span>
              <h3 id="adb-title" className="adb-title">
                {t('adblockTitle')}
              </h3>
              <p id="adb-body" className="adb-body">
                {t('adblockBody')}
              </p>
            </div>
            <button className="adb-btn" onClick={() => void check()} disabled={checking}>
              {t('adblockRetry')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
