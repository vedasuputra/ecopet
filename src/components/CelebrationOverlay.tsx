import { useEffect, useMemo } from 'react'
import { useT } from '../i18n'
import { useCelebration } from '../store/useCelebration'
import MeiluAvatar from './MeiluAvatar'

const SHOW_MS = 3200
const COLORS = ['#e34948', '#eda100', '#1baf7a', '#2a78d6', '#e87ba4', '#6250d6']
const PIECES = 26

const css = `
@keyframes celebrate-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(540deg); opacity: 0.9; }
}
.celebrate-piece { position: absolute; top: -12px; width: 8px; height: 14px; animation: celebrate-fall linear forwards; }
@media (prefers-reduced-motion: reduce) { .celebrate-piece { display: none; } }
`

// Covers the phone frame (PhoneFrame is position: relative). Tap anywhere to dismiss; auto-hides.
export default function CelebrationOverlay() {
  const t = useT()
  const { message, id, hide } = useCelebration()

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(hide, SHOW_MS)
    return () => clearTimeout(timer)
  }, [message, id, hide])

  // new random confetti each time it opens
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.8 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  )

  if (!message) return null
  return (
    <div
      role="status"
      onClick={hide}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        textAlign: 'center',
        padding: 24,
        overflow: 'hidden',
      }}
    >
      <style>{css}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="celebrate-piece"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        />
      ))}
      <MeiluAvatar celebrating size={150} />
      <h2 style={{ margin: '12px 0 4px' }}>{message}</h2>
      <small>{t('celebrateTap')}</small>
    </div>
  )
}
