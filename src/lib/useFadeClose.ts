import { useCallback, useRef, useState } from 'react'

// Closing a popup with a short fade-out: `closing` is true for a moment (put the class `is-closing` on the backdrop), and only
// then the real close runs. `closing` STAYS true afterwards: the popup is about to disappear (a route change can leave it on
// screen for a moment), and letting it go back to "open" made it flash open again. A popup that is kept and shown again calls
// `reopen` first. The returned functions are stable, so they are safe in effect dependencies.
export function useFadeClose(onClose: () => void, ms = 160): [boolean, () => void, () => void] {
  const latest = useRef(onClose)
  latest.current = onClose
  const busy = useRef(false)
  const [closing, setClosing] = useState(false)
  const close = useCallback(() => {
    if (busy.current) return
    busy.current = true
    setClosing(true)
    setTimeout(() => latest.current(), ms)
  }, [ms])
  const reopen = useCallback(() => {
    busy.current = false
    setClosing(false)
  }, [])
  return [closing, close, reopen]
}
