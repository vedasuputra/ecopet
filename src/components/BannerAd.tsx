import { useEffect, useState } from 'react'
import { BANNER_UNIT, loadGpt } from '../lib/gpt'

// Always-visible banner (no reward for views or clicks, per Google policy).
// Falls back to a text placeholder if GPT is blocked or no ad is returned.
const DIV_ID = 'gpt-banner'

export default function BannerAd() {
  const [filled, setFilled] = useState(false)

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
    // Fixed 50px-high strip so the layout never jumps, whether or not an ad fills.
    <div style={{ height: 50, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div id={DIV_ID} />
      {!filled && <div>BANNER AD</div>}
    </div>
  )
}
