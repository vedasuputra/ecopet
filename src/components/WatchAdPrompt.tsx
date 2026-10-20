import { useEffect, useRef } from 'react'
import { useT } from '../i18n'
import { AD_REWARD, useAppStore } from '../store/useAppStore'

// The popup behind the "+" button in the top bar: watch a short ad to earn coins. Shows the reward, how many ads are left today
// and one button (there is no "not now": the X closes it).
export default function WatchAdPrompt({ onWatch, onClose }: { onWatch: () => void; onClose: () => void }) {
  const t = useT()
  const left = useAppStore((s) => s.adsLeftToday)()
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="popup-backdrop" role="dialog" aria-modal="true" aria-label={t('adPromptHeading')} onClick={onClose}>
      <div className="popup-card ad-card" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          <div className="popup-titles">
            <h3>{t('adPromptHeading')}</h3>
            <p className="popup-sub">{left > 0 ? t('adsLeft', { n: left }) : t('dailyLimit')}</p>
          </div>
          <button ref={closeBtn} className="popup-close" onClick={onClose} aria-label={t('close')} title={t('close')}>
            <span className="mi" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* the middle takes the free height, so the card is nearly square and the button sits far below the heading */}
        <div className={`ad-reward${left === 0 ? ' is-off' : ''}`}>
          <span className="ad-reward-amount">
            <span className="mi" aria-hidden="true">
              monetization_on
            </span>
            +{AD_REWARD}
          </span>
          <p className="popup-hint ad-hint">{left > 0 ? t('adPromptBody', { n: AD_REWARD }) : t('adPromptDone')}</p>
        </div>

        <div className="popup-actions one">
          {left > 0 ? (
            <button className="popup-btn popup-btn-primary" onClick={onWatch}>
              {t('adPromptWatch')}
            </button>
          ) : (
            <button className="popup-btn" onClick={onClose}>
              {t('close')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
