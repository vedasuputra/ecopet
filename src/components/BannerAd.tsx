import { useEffect, useRef, useState } from 'react'
import { BANNER_UNIT, loadGpt } from '../lib/gpt'

// Always-visible banner (no reward for views or clicks, per Google policy).
// Falls back to a text placeholder if GPT is blocked or no ad is returned.
const DIV_ID = 'gpt-banner'
const AD_W = 320
const AD_H = 50

export default function BannerAd() {
  const [filled, setFilled] = useState(false)
  // The ad is 320x50. The strip is as wide as the screen, so the ad is scaled up to touch both sides.
  const wrap = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setScale(Math.min(2, Math.max(1, el.clientWidth / AD_W)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let slot: any
    let tag: any
    let onRender: ((e: any) => void) | undefined
    let cancelled = false

    loadGpt()
      .then((googletag) => {
        if (cancelled) return
        tag = googletag
        // Wide, short banner only (320x50). A 300x250 "medium rectangle" is too tall for the layout.
        slot = googletag.defineSlot(BANNER_UNIT, [320, 50], DIV_ID)
        if (!slot) return
        slot.addService(googletag.pubads())
        onRender = (e) => {
          if (e.slot === slot) setFilled(!e.isEmpty)
        }
        googletag.pubads().addEventListener('slotRenderEnded', onRender)
        googletag.enableServices()
        googletag.display(DIV_ID)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (tag && onRender) tag.pubads().removeEventListener('slotRenderEnded', onRender)
      if (tag && slot) tag.destroySlots([slot])
    }
  }, [])

  return (
    // No ad, no strip: it stays collapsed (no placeholder text) until an ad has really been served, then it opens to the
    // height of the scaled ad. The ad slot itself is always in the page, so the ad can load while the strip is closed.
    <div ref={wrap} className={`banner-ad${filled ? '' : ' banner-empty'}`} style={{ height: filled ? AD_H * scale : 0 }}>
      <div style={{ width: AD_W, height: AD_H, transform: `scale(${scale})`, transformOrigin: 'top left', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div id={DIV_ID} />
      </div>
    </div>
  )
}
