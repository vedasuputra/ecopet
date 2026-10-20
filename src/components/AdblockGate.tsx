import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../i18n'

// Ads pay for the coins and coupons, so the app asks travelers to turn off their ad blocker.
// Two checks: a "bait" element that blockers hide, and a request to the ad server that blockers cancel.
// Being offline is not treated as a blocker.
async function adblockPresent(): Promise<boolean> {
  const bait = document.createElement('div')
  bait.className = 'adsbox ad-banner ads advert pub_300x250'
  bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:10px;height:10px'
  bait.innerHTML = '&nbsp;'
  document.body.appendChild(bait)
  await new Promise((r) => setTimeout(r, 120))
  const hidden = bait.offsetHeight === 0 || getComputedStyle(bait).display === 'none' || getComputedStyle(bait).visibility === 'hidden'
  bait.remove()
  if (hidden) return true
  if (!navigator.onLine) return false
  try {
    await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
    return false
  } catch {
    // blocked by an extension, or the network failed: confirm the network works before blaming the blocker
    try {
      await fetch(window.location.origin + '/favicon.ico', { method: 'HEAD', cache: 'no-store' })
      return true
    } catch {
      return false
    }
  }
}

export default function AdblockGate({ children }: { children: ReactNode }) {
  const t = useT()
  const [blocked, setBlocked] = useState(false)
  const [checking, setChecking] = useState(false)

  const check = async () => {
    setChecking(true)
    setBlocked(await adblockPresent())
    setChecking(false)
  }
  useEffect(() => {
    void check()
  }, [])

  if (!blocked) return <>{children}</>
  return (
    <div style={{ padding: 24 }}>
      <h2>{t('adblockTitle')}</h2>
      <p>{t('adblockBody')}</p>
      <button onClick={() => void check()} disabled={checking}>
        {t('adblockRetry')}
      </button>
    </div>
  )
}
