// Google IMA SDK (HTML5) loader + ad tag config.
// Default is Google's public sample VAST tag for a portrait 360x640 linear video ad (no account needed).
// After approval, set VITE_IMA_AD_TAG to your own Ad Manager video ad tag.

const SAMPLE_VERTICAL_TAG =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_vertical_ad_samples&sz=360x640&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator='

export const IMA_AD_TAG: string = import.meta.env.VITE_IMA_AD_TAG || SAMPLE_VERTICAL_TAG

let loading: Promise<any> | null = null

/** Loads ima3.js once. Resolves with window.google.ima, or rejects if blocked / offline. */
export function loadIma(): Promise<any> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
    s.onload = () => ((window as any).google?.ima ? resolve((window as any).google.ima) : reject(new Error('IMA missing')))
    s.onerror = () => {
      loading = null // allow retry (ad blockers, offline)
      reject(new Error('ima3.js failed to load'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** The tag ends with "correlator=", which should be a fresh number per request. */
export const withCorrelator = (tag: string) => tag + Math.floor(Math.random() * 1e12)
