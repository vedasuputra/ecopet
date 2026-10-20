import { useEffect, useRef } from 'react'
import { useT } from '../i18n'
import Confetti from './Confetti'
import { useRewardPopup } from '../store/useRewardPopup'

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
      <Confetti />
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
