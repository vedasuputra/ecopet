import { useEffect, useRef, useState } from 'react'
import MeiluSprite, { SPRITE_VIEW, loadSprite } from './MeiluSprite'

// Meilu is a layered SVG (see MeiluSprite). Small animations move her parts on their own: she breathes, blinks, her
// tail sways and her wings twitch. The bigger ones (nod, hop, squish, wiggle, party) are CSS transforms on the whole figure.
//   nodding      head-nod while she replies in chat
//   celebrating  happy hops (quest done, gift opened)
//   interactive  tap = a small squish + hop, press and stroke = floating white hearts
const css = `
@keyframes meilu-nod {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25% { transform: rotate(-4deg) translateY(4px); }
  50% { transform: rotate(0deg) translateY(0); }
  75% { transform: rotate(-4deg) translateY(4px); }
}
@keyframes meilu-hop {
  0% { transform: translateY(0) scale(1, 1); }
  15% { transform: translateY(0) scale(1.04, 0.94); }
  45% { transform: translateY(-11px) scale(0.98, 1.04); }
  75% { transform: translateY(0) scale(1.03, 0.96); }
  90% { transform: translateY(-2px) scale(0.995, 1.01); }
  100% { transform: translateY(0) scale(1, 1); }
}
@keyframes meilu-squish {
  0% { transform: scale(1, 1); }
  100% { transform: scale(1.025, 0.97); }
}
@keyframes meilu-wiggle {
  0%, 100% { transform: rotate(-2deg) scale(1.015); }
  50% { transform: rotate(2deg) scale(1.015); }
}
@keyframes meilu-party {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-16px) rotate(-6deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(-16px) rotate(6deg); }
}
@keyframes meilu-think {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  50% { transform: rotate(-6deg) translateY(1px); }
}
@keyframes meilu-heart {
  0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
  15% { opacity: 1; }
  100% { transform: translate(var(--dx), -56px) scale(1.1); opacity: 0; }
}
/* while her pictures load: a small ring that turns, and she fades in when she is whole */
@keyframes meilu-spin { to { transform: rotate(360deg); } }
.meilu-loading { position: absolute; left: 50%; top: 50%; border-radius: 50%; border: 3px solid rgba(22, 143, 214, 0.25); border-top-color: var(--blue, #168fd6); animation: meilu-spin 0.8s linear infinite; }
.meilu-fade { transition: opacity 0.3s ease; }
.meilu-still, .meilu-still * { animation: none !important; }
/* parts of the SVG: transform-origin is in the drawing's own units (the pivot of each part) */
@keyframes mp-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.008, 1.014); } }
@keyframes mp-head { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-1.6px) rotate(0.7deg); } }
@keyframes mp-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.08); } }
@keyframes mp-tail { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(3deg); } }
@keyframes mp-wing-r { 0%, 78%, 100% { transform: rotate(0deg); } 84% { transform: rotate(-4deg); } 90% { transform: rotate(0.5deg); } 95% { transform: rotate(-2deg); } }
@keyframes mp-wing-l { 0%, 40%, 100% { transform: rotate(0deg); } 46% { transform: rotate(3deg); } 52% { transform: rotate(-0.5deg); } 58% { transform: rotate(1.5deg); } }
.mp-body { transform-origin: 271px 412px; animation: mp-breathe 3.6s ease-in-out infinite; }
.mp-head { transform-origin: 268px 272px; animation: mp-head 3.6s ease-in-out infinite; }
.mp-eyes { transform-origin: 252px 216px; animation: mp-blink 5.2s ease-in-out infinite; }
.mp-tail { transform-origin: 384px 358px; animation: mp-tail 4.8s ease-in-out infinite; }
.mp-wing-right { transform-origin: 336px 232px; animation: mp-wing-r 7s ease-in-out infinite; }
.mp-wing-left { transform-origin: 236px 236px; animation: mp-wing-l 8.5s ease-in-out infinite; }
.meilu-nod { animation: meilu-nod 0.9s ease-in-out infinite; transform-origin: 50% 90%; }
.meilu-hop { animation: meilu-hop 0.65s ease-out; transform-origin: 50% 100%; }
.meilu-squish { animation: meilu-squish 0.12s ease-out forwards; transform-origin: 50% 100%; }
.meilu-wiggle { animation: meilu-wiggle 0.8s ease-in-out infinite; transform-origin: 50% 100%; }
.meilu-think { animation: meilu-think 1.6s ease-in-out infinite; transform-origin: 50% 90%; }
.meilu-party { animation: meilu-party 0.7s ease-in-out infinite; transform-origin: 50% 100%; }
.meilu-heart { position: absolute; pointer-events: none; font-size: 20px; line-height: 1; color: #fff; text-shadow: 0 1px 4px rgba(4, 67, 136, 0.45); animation: meilu-heart 1.1s ease-out forwards; }
/* ---- idle moods (the same pivots as above). The eyes only ever squint: scaleY never goes below 0.45, so they stay open.
   They sit before the tap/stroke rules, so a tap or a stroke still wins. */
/* morning: sleepy. The head droops and lifts, the eyes are half open, and once in a while she stretches a wing. */
@keyframes mm-head { 0%, 100% { transform: translateY(2px) rotate(3deg); } 40% { transform: translateY(-1px) rotate(-1deg); } 72% { transform: translateY(3px) rotate(5deg); } }
@keyframes mm-eyes { 0%, 100% { transform: scaleY(0.74); } 45% { transform: scaleY(0.9); } 74% { transform: scaleY(0.5); } }
@keyframes mm-wing-r { 0%, 52%, 100% { transform: rotate(0deg); } 62%, 78% { transform: rotate(-13deg); } 90% { transform: rotate(0deg); } }
@keyframes mm-body { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.01, 1.026); } }
.mood-morning .mp-head { animation: mm-head 6s ease-in-out infinite; }
.mood-morning .mp-eyes { animation: mm-eyes 6s ease-in-out infinite; }
.mood-morning .mp-wing-right { animation: mm-wing-r 9s ease-in-out infinite; }
.mood-morning .mp-body { animation: mm-body 5s ease-in-out infinite; }
.mood-morning .mp-tail { animation-duration: 8s; }
/* day: waves hello with her other wing (the one on the left of the screen), head tilted, tail wagging. The wing hangs behind her
   body, so it swings out to the side to wave. */
@keyframes md-wing-l { 0%, 62%, 100% { transform: rotate(0deg); } 8% { transform: rotate(60deg); } 16% { transform: rotate(36deg); } 24% { transform: rotate(62deg); } 32% { transform: rotate(36deg); } 40% { transform: rotate(62deg); } 48% { transform: rotate(36deg); } 56% { transform: rotate(60deg); } }
@keyframes md-head { 0%, 62%, 100% { transform: translateY(0) rotate(0deg); } 8%, 54% { transform: translateY(-1.5px) rotate(-3.5deg); } }
@keyframes md-eyes { 0%, 82%, 90%, 100% { transform: scaleY(1); } 86% { transform: scaleY(0.2); } }
@keyframes md-tail { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(8deg); } }
.mood-day .mp-wing-left { animation: md-wing-l 4.6s ease-in-out infinite; }
.mood-day .mp-head { animation: md-head 4.6s ease-in-out infinite; }
.mood-day .mp-eyes { animation: md-eyes 4.6s ease-in-out infinite; }
.mood-day .mp-tail { animation: md-tail 1.2s ease-in-out infinite; }
/* evening: tired. Slumped, heavy slow breaths, drooping wings and tail, heavy-lidded eyes */
@keyframes me-head { 0%, 100% { transform: translateY(4px) rotate(-4deg); } 50% { transform: translateY(6px) rotate(-6deg); } }
@keyframes me-eyes { 0%, 100% { transform: scaleY(0.82); } 70% { transform: scaleY(0.58); } 78% { transform: scaleY(0.82); } }
@keyframes me-body { 0%, 100% { transform: scale(1, 0.985); } 50% { transform: scale(1.014, 1.032); } }
@keyframes me-wing { 0%, 100% { transform: rotate(4deg); } 50% { transform: rotate(6deg); } }
@keyframes me-tail { 0%, 100% { transform: rotate(7deg); } 50% { transform: rotate(9deg); } }
.mood-evening .mp-head { animation: me-head 5.5s ease-in-out infinite; }
.mood-evening .mp-eyes { animation: me-eyes 5.5s ease-in-out infinite; }
.mood-evening .mp-body { animation: me-body 5.5s ease-in-out infinite; }
.mood-evening .mp-wing-right, .mood-evening .mp-wing-left { animation: me-wing 5.5s ease-in-out infinite; }
.mood-evening .mp-tail { animation: me-tail 5.5s ease-in-out infinite; }
/* night: on the way to bed. The head sinks slowly, jerks up awake, sinks again. The eyes get heavy but never close */
@keyframes mn-head { 0%, 100% { transform: translateY(0) rotate(0deg); } 35% { transform: translateY(3px) rotate(6deg); } 48% { transform: translateY(4.5px) rotate(9deg); } 52% { transform: translateY(-1px) rotate(-2deg); } 60% { transform: translateY(0) rotate(0deg); } }
@keyframes mn-eyes { 0%, 100% { transform: scaleY(0.8); } 35% { transform: scaleY(0.58); } 48% { transform: scaleY(0.46); } 52% { transform: scaleY(0.95); } 60% { transform: scaleY(0.8); } }
@keyframes mn-body { 0%, 100% { transform: scale(1, 1) rotate(0deg); } 48% { transform: scale(1.008, 1.02) rotate(0.8deg); } 52% { transform: scale(1, 1.004) rotate(-0.4deg); } }
.mood-night .mp-head { animation: mn-head 7s ease-in-out infinite; }
.mood-night .mp-eyes { animation: mn-eyes 7s ease-in-out infinite; }
.mood-night .mp-body { animation: mn-body 7s ease-in-out infinite; }
.mood-night .mp-wing-right, .mood-night .mp-wing-left { animation: me-wing 7s ease-in-out infinite; }
.mood-night .mp-tail { animation-duration: 9s; }

/* tap: the head bounces a beat late, the wings flap out (showing the inner wing), the tail flicks, she blinks */
@keyframes mp-tap-head { 0% { transform: translateY(0) rotate(0deg); } 20% { transform: translateY(2.5px) rotate(-2.5deg); } 55% { transform: translateY(-4px) rotate(3deg); } 80% { transform: translateY(1px) rotate(-1deg); } 100% { transform: translateY(0) rotate(0deg); } }
@keyframes mp-tap-wing-r { 0% { transform: rotate(0deg); } 35% { transform: rotate(-16deg); } 60% { transform: rotate(-9deg); } 100% { transform: rotate(0deg); } }
@keyframes mp-tap-wing-l { 0% { transform: rotate(0deg); } 35% { transform: rotate(14deg); } 60% { transform: rotate(8deg); } 100% { transform: rotate(0deg); } }
@keyframes mp-tap-tail { 0% { transform: rotate(0deg); } 35% { transform: rotate(12deg); } 65% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }
@keyframes mp-tap-eyes { 0%, 30%, 100% { transform: scaleY(1); } 14% { transform: scaleY(0.1); } }
.meilu-hop .mp-head { animation: mp-tap-head 0.65s ease-out; }
.meilu-hop .mp-wing-right { animation: mp-tap-wing-r 0.65s ease-out; }
.meilu-hop .mp-wing-left { animation: mp-tap-wing-l 0.65s ease-out; }
.meilu-hop .mp-tail { animation: mp-tap-tail 0.65s ease-out; }
.meilu-hop .mp-eyes { animation: mp-tap-eyes 0.65s ease-out; }
/* pressed: she gets squashed a little and squints */
.meilu-squish .mp-head { animation: none; transform: translateY(2px); }
.meilu-squish .mp-eyes { animation: none; transform: scaleY(0.75); }
/* stroked: eyes in a happy squint (still visible), head leaning into the hand, tail wagging, wings ruffling */
@keyframes mp-pet-head { 0%, 100% { transform: translateY(1px) rotate(-3.5deg); } 50% { transform: translateY(0) rotate(2.5deg); } }
@keyframes mp-pet-tail { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(8deg); } }
@keyframes mp-pet-wing-r { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-6deg); } }
@keyframes mp-pet-wing-l { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(5deg); } }
@keyframes mp-pet-body { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.014, 1.02); } }
.meilu-wiggle .mp-head { animation: mp-pet-head 0.8s ease-in-out infinite; }
.meilu-wiggle .mp-eyes { animation: none; transform: scaleY(0.62); }
.meilu-wiggle .mp-tail { animation: mp-pet-tail 0.38s ease-in-out infinite; }
.meilu-wiggle .mp-wing-right { animation: mp-pet-wing-r 0.55s ease-in-out infinite; }
.meilu-wiggle .mp-wing-left { animation: mp-pet-wing-l 0.62s ease-in-out infinite; }
.meilu-wiggle .mp-body { animation: mp-pet-body 0.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .meilu-hop *, .meilu-wiggle *, .meilu-squish *, [class*='mood-'] * { animation: none !important; }
  .meilu-nod, .meilu-think, .meilu-hop, .meilu-squish, .meilu-wiggle, .meilu-party, .mp-body, .mp-head, .mp-eyes, .mp-tail, .mp-wing-right, .mp-wing-left { animation: none; }
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

const GLYPHS = ['♥', '♥', '♥', '♪'] // plain text glyphs, so they take the white colour (emoji would keep their own)
const TAP_MS = 250 // shorter than this (and barely moved) = a tap, otherwise it is stroking
const HEART_EVERY_MS = 220

export default function MeiluAvatar({
  nodding = false,
  celebrating = false,
  reaction = '',
  still = false,
  spinner = true,
  interactive = false,
  mood,
  halfBody = false,
  fluid = false,
  size = 120,
}: {
  nodding?: boolean
  celebrating?: boolean
  /** A reaction played while it lasts (chat): nod, hop, think (a curious tilt) or party. */
  reaction?: '' | 'nod' | 'hop' | 'think' | 'party'
  /** No movement at all (the older messages of the chat). */
  still?: boolean
  /** Show a turning ring until all her pictures have loaded (default). */
  spinner?: boolean
  interactive?: boolean
  /** Her idle behaviour follows the time of day: sleepy in the morning, waving at noon, tired in the evening, nodding off at night. Her eyes always stay open. */
  mood?: 'morning' | 'day' | 'evening' | 'night'
  /** Only the top part (head and chest) shows, as if she peeks out from behind the box below her. */
  halfBody?: boolean
  /** As wide as the space she is in (the home screen), instead of a fixed `size` in pixels. */
  fluid?: boolean
  size?: number
}) {
  const [anim, setAnim] = useState<Anim>('')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let on = true
    void loadSprite().then(() => on && setReady(true))
    return () => {
      on = false
    }
  }, [])
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
    later(spawnHeart, 110)
    later(spawnHeart, 230)
    later(() => setAnim((a) => (a === 'hop' ? '' : a)), 680)
  }

  const cls = nodding ? 'meilu-nod' : celebrating ? 'meilu-party' : reaction ? `meilu-${reaction}` : anim ? `meilu-${anim}` : undefined

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
          display: fluid ? 'block' : 'inline-block',
          width: fluid ? '100%' : size,
          // keep about the upper 62% of the drawing for the half-body view
          ...(halfBody ? (fluid ? { aspectRatio: `${SPRITE_VIEW.w} / ${Math.round(SPRITE_VIEW.h * 0.62)}` } : { height: Math.round(size * (SPRITE_VIEW.h / SPRITE_VIEW.w) * 0.62) }) : {}),
          // cut only below (the tail): a waving wing or a hop may still reach past the sides and the top
          // (minHeight 0: without it the box grows to fit the whole drawing and the aspect ratio is lost)
          ...(halfBody ? { clipPath: 'inset(-50% -50% 0 -50%)', minHeight: 0 } : {}),
          userSelect: 'none',
          touchAction: interactive ? 'none' : undefined, // stroking must not scroll the page
          cursor: interactive ? 'pointer' : undefined,
        }}
      >
        <div className="meilu-fade" style={{ opacity: ready ? 1 : 0 }}>
          <MeiluSprite className={[cls, mood && `mood-${mood}`, still && 'meilu-still'].filter(Boolean).join(' ') || undefined} width={fluid ? undefined : size} />
        </div>
        {!ready && spinner && (
          <span
            className="meilu-loading"
            role="status"
            aria-label="Loading"
            style={{ width: 28, height: 28, margin: '-14px 0 0 -14px' }}
          />
        )}
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
