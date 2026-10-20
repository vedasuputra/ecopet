import { useEffect, useState } from 'react'
import './sky.css'

// The sky behind Meilu follows the clock of the device: morning (sun and clouds), day, evening (orange sunset) and
// night (a moon and stars; not too dark, so she still stands out). Pure CSS and a few small elements, no library.
// For testing, open any page with ?sky=morning, ?sky=day, ?sky=evening or ?sky=night.
export type Period = 'morning' | 'day' | 'evening' | 'night'

export function periodAt(d: Date): Period {
  const t = d.getHours() + d.getMinutes() / 60
  if (t >= 5 && t < 10.5) return 'morning'
  if (t >= 10.5 && t < 16) return 'day'
  if (t >= 16 && t < 18.5) return 'evening'
  return 'night'
}

function forced(): Period | null {
  try {
    const v = new URLSearchParams(window.location.search).get('sky')
    return v === 'morning' || v === 'day' || v === 'evening' || v === 'night' ? v : null
  } catch {
    return null
  }
}

// fixed star positions (x %, y %, size px, twinkle delay s), so the sky does not change on every render
const STARS: [number, number, number, number][] = [
  [6, 12, 2, 0], [14, 34, 1.5, 1.2], [22, 8, 2.5, 0.6], [31, 22, 1.5, 2.1], [40, 6, 2, 1.7], [47, 30, 1.5, 0.3],
  [55, 14, 2, 2.4], [63, 5, 1.5, 0.9], [71, 26, 2.5, 1.5], [79, 10, 1.5, 0.4], [86, 32, 2, 2.0], [93, 16, 2.5, 1.1],
  [10, 52, 1.5, 1.9], [27, 44, 2, 0.2], [36, 56, 1.5, 1.4], [58, 48, 1.5, 2.3], [74, 54, 2, 0.8], [90, 50, 1.5, 1.6],
  [4, 30, 1.5, 0.7], [18, 20, 1.5, 2.6], [50, 18, 1.5, 1.0], [67, 38, 1.5, 0.1], [82, 22, 1.5, 1.8], [96, 40, 2, 2.2],
]

function Cloud({ className }: { className: string }) {
  return (
    <svg className={`sky-cloud ${className}`} viewBox="0 0 120 50" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="34" cy="33" rx="28" ry="14" />
        <ellipse cx="62" cy="24" rx="26" ry="18" />
        <ellipse cx="90" cy="33" rx="26" ry="13" />
      </g>
    </svg>
  )
}

/** The time of day on this device (or the ?sky= test value), refreshed every minute. */
export function usePeriod(): Period {
  const [period, setPeriod] = useState<Period>(() => forced() ?? periodAt(new Date()))
  useEffect(() => {
    if (forced()) return
    const id = setInterval(() => setPeriod(periodAt(new Date())), 60_000)
    return () => clearInterval(id)
  }, [])
  return period
}

export default function HeroSky({ period }: { period: Period }) {
  return (
    <div className={`sky sky-${period}`} aria-hidden="true">
      {period !== 'night' && <div className="sky-sun" />}
      {period === 'night' && <div className="sky-moon" />}
      <Cloud className="sky-cloud-1" />
      <Cloud className="sky-cloud-2" />
      {period !== 'evening' && <Cloud className="sky-cloud-3" />}
      {period === 'night' &&
        STARS.map(([x, y, s, d], i) => <span key={i} className="sky-star" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }} />)}
    </div>
  )
}
