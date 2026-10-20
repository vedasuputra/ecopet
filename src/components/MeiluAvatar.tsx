import { useEffect, useRef, useState } from 'react'

// Meilu is a flat PNG, so every animation is a CSS transform on the whole image.
//   nodding      head-nod while she replies in chat
//   celebrating  happy hops (quest done, gift opened)
//   interactive  tap = squish + hop, press and stroke = floating hearts
const css = `
@keyframes meilu-nod {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-4deg) translateY(4px); }
  50% { transform: rotate(0deg) translateY(0); }
  75% { transform: rotate(-4deg) translateY(4px); }
}
@keyframes meilu-hop {
  0% { transform: translateY(0) scale(1, 1); }
  20% { transform: translateY(0) scale(1.08, 0.88); }
  50% { transform: translateY(-18px) scale(0.96, 1.06); }
  80% { transform: translateY(0) scale(1.06, 0.92); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes meilu-squish {
  0% { transform: scale(1, 1); }
  100% { transform: scale(1.1, 0.86); }
}
@keyframes meilu-wiggle {
  0%, 100% { transform: rotate(-3deg) scale(1.03); }
  50% { transform: rotate(3deg) scale(1.03); }
}
@keyframes meilu-party {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-16px) rotate(-6deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(-16px) rotate(6deg); }
}
@keyframes meilu-heart {
  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translate(var(--dx), -70px) scale(1.1); opacity: 0; }
}
.meilu-nod { animation: meilu-nod 0.9s ease-in-out infinite; transform-origin: 50% 90%; }
.meilu-hop { animation: meilu-hop 0.5s ease-out; transform-origin: 50% 100%; }
.meilu-squish { animation: meilu-squish 0.12s ease-out forwards; transform-origin: 50% 100%; }
.meilu-wiggle { animation: meilu-wiggle 0.35s ease-in-out infinite; transform-origin: 50% 100%; }
.meilu-party { animation: meilu-party 0.7s ease-in-out infinite; transform-origin: 50% 100%; }
.meilu-heart { position: absolute; pointer-events: none; font-size: 18px; animation: meilu-heart 1.1s ease-out forwards; }
@media (prefers-reduced-motion: reduce) {
  .meilu-nod, .meilu-hop, .meilu-squish, .meilu-wiggle, .meilu-party { animation: none; }
  .meilu-heart { animation: none; opacity: 0.9; }
}
`

type Anim = '' | 'hop' | 'squish' | 'wiggle'
interface Heart {
  id: number
  x: number // % across the image
  dx: number // horizontal drift in px
  glyph: string
}

const GLYPHS = ['💚', '💛', '🤍', '🎵']
const TAP_MS = 250 // shorter than this (and barely moved) = a tap, otherwise it is stroking
const HEART_EVERY_MS = 220

export default function MeiluAvatar({
  nodding = false,
  celebrating = false,
  interactive = false,
  halfBody = false,
  size = 120,
}: {
  nodding?: boolean
  celebrating?: boolean
  interactive?: boolean
  /** Only the top part (head and chest) shows, as if she peeks out from behind the box below her. */
  halfBody?: boolean
  size?: number
}) {
  const [anim, setAnim] = useState<Anim>('')
  const [hearts, setHearts] = useState<Heart[]>([])
  const press = useRef<{ at: number; x: number; y: number; moved: number; lastHeart: number } | null>(null)
  const nextId = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))

  const spawnHeart = () => {
    const id = nextId.current++
    const heart: Heart = {
      id,
      x: 20 + Math.random() * 60,
      dx: Math.round((Math.random() - 0.5) * 50),
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
    }
    setHearts((h) => [...h.slice(-8), heart])
    later(() => setHearts((h) => h.filter((x) => x.id !== id)), 1200)
  }

  const onDown = (e: React.PointerEvent) => {
    if (!interactive) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    press.current = { at: Date.now(), x: e.clientX, y: e.clientY, moved: 0, lastHeart: 0 }
    setAnim('squish')
  }

  const onMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!interactive || !p) return
    p.moved += Math.abs(e.clientX - p.x) + Math.abs(e.clientY - p.y)
    p.x = e.clientX
    p.y = e.clientY
    // stroking: enough movement while pressed -> wiggle and hearts
    if (p.moved > 18) {
      setAnim('wiggle')
      if (Date.now() - p.lastHeart > HEART_EVERY_MS) {
        p.lastHeart = Date.now()
        spawnHeart()
      }
    }
  }

  const onUp = () => {
    const p = press.current
    press.current = null
    if (!interactive || !p) return
    const isTap = Date.now() - p.at < TAP_MS && p.moved < 18
    if (!isTap) return setAnim('')

    setAnim('hop')
    spawnHeart()
    later(() => setAnim((a) => (a === 'hop' ? '' : a)), 520)
  }

  const cls = nodding ? 'meilu-nod' : celebrating ? 'meilu-party' : anim ? `meilu-${anim}` : undefined

  return (
    <>
      <style>{css}</style>
      <div
        aria-label="Meilu"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: 'relative',
          display: 'inline-block',
          width: size,
          // the sprite is 364x294: keep about the upper 62% of it for the half-body view
          ...(halfBody ? { height: Math.round(size * (294 / 364) * 0.62), overflow: 'hidden' } : {}),
          userSelect: 'none',
          touchAction: interactive ? 'none' : undefined, // stroking must not scroll the page
          cursor: interactive ? 'pointer' : undefined,
        }}
      >
        <img src="/meilu.png" alt="Meilu" width={size} className={cls} draggable={false} style={{ display: 'block' }} />
        {hearts.map((h) => (
          <span
            key={h.id}
            className="meilu-heart"
            style={{ left: `${h.x}%`, top: '10%', ['--dx' as string]: `${h.dx}px` }}
            aria-hidden="true"
          >
            {h.glyph}
          </span>
        ))}
      </div>
    </>
  )
}
