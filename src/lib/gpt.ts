// Google Publisher Tag (Google Ad Manager) loader + ad unit config.
// Defaults are Google's public sample units, so no account is needed for the demo.
// After approval, set VITE_GPT_BANNER_UNIT / VITE_GPT_REWARDED_UNIT (ad unit paths are not secret).

export const BANNER_UNIT: string =
  import.meta.env.VITE_GPT_BANNER_UNIT || '/6355419/Travel/Europe/France/Paris'
export const REWARDED_UNIT: string =
  import.meta.env.VITE_GPT_REWARDED_UNIT || '/22639388115/rewarded_web_example'

let loading: Promise<any> | null = null

/** Loads gpt.js once. Resolves with window.googletag, or rejects if blocked / offline. */
export function loadGpt(): Promise<any> {
  const w = window as any
  w.googletag = w.googletag || { cmd: [] }
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
    s.crossOrigin = 'anonymous'
    s.onload = () => w.googletag.cmd.push(() => resolve(w.googletag))
    s.onerror = () => {
      loading = null // allow a retry later (ad blockers, offline)
      reject(new Error('gpt.js failed to load'))
    }
    document.head.appendChild(s)
  })
  return loading
}
