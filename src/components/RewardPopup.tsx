import { useEffect, useRef } from 'react'
import { useT } from '../i18n'
import { useRewardPopup } from '../store/useRewardPopup'

// white confetti: left %, size px, fall time s, delay s, sideways drift px
const CONFETTI: [number, number, number, number, number][] = [
  [4, 7, 3.4, 0.0, 20], [9, 5, 4.1, 0.6, -14], [14, 8, 3.7, 1.1, 24], [19, 6, 4.4, 0.3, -20], [24, 9, 3.2, 1.5, 12],
  [29, 5, 4.0, 0.9, -26], [34, 7, 3.6, 0.2, 18], [39, 6, 4.3, 1.3, -10], [44, 8, 3.3, 0.7, 22], [49, 5, 4.2, 1.7, -18],
  [54, 7, 3.5, 0.4, 16], [59, 9, 3.9, 1.0, -24], [64, 6, 3.4, 1.9, 10], [69, 8, 4.0, 0.1, -16], [74, 5, 3.6, 1.4, 26],
  [79, 7, 4.2, 0.8, -12], [84, 6, 3.3, 1.6, 20], [89, 9, 3.8, 0.5, -22], [94, 5, 4.1, 1.2, 14], [97, 7, 3.5, 2.0, -18],
  [2, 6, 3.9, 2.2, 12], [31, 8, 3.2, 2.4, -20], [61, 6, 4.4, 2.1, 18], [86, 7, 3.7, 2.3, -14],
]

// The popup that tells you the coins arrived (after watching an ad), with white confetti falling behind the card.
export default function RewardPopup() {
  const t = useT()
  const coins = useRewardPopup((s) => s.coins)
  const hide = useRewardPopup((s) => s.hide)
  const okBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (coins === null) return
    okBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [coins, hide])

  if (coins === null) return null
  return (
    <div className="popup-backdrop" role="dialog" aria-modal="true" aria-label={t('rewardTitle')} onClick={hide}>
      <div className="confetti" aria-hidden="true">
        {CONFETTI.map(([x, s, d, delay, drift], i) => (
          <i key={i} style={{ left: `${x}%`, width: s, height: s * 1.6, animationDuration: `${d}s`, animationDelay: `${delay}s`, ['--drift' as string]: `${drift}px` }} />
        ))}
      </div>
      <div className="popup-card ad-card" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          <div className="popup-titles">
            <h3>{t('rewardTitle')}</h3>
          </div>
          <button className="popup-close" onClick={hide} aria-label={t('close')} title={t('close')}>
            <span className="mi" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <div className="ad-reward">
          <span className="ad-reward-amount">
            <span className="mi" aria-hidden="true">
              monetization_on
            </span>
            +{coins}
          </span>
          <p className="popup-hint ad-hint">{t('rewardBody')}</p>
        </div>
        <div className="popup-actions one">
          <button ref={okBtn} className="popup-btn popup-btn-primary" onClick={hide}>
            {t('rewardOk')}
          </button>
        </div>
      </div>
    </div>
  )
}
