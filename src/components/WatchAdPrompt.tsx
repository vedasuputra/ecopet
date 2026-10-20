import { useEffect } from 'react'
import { useT } from '../i18n'
import { AD_REWARD, useAppStore } from '../store/useAppStore'

// The popup behind the "+" button in the top bar: "Watch an ad to earn 5 coins?"
export default function WatchAdPrompt({ onWatch, onClose }: { onWatch: () => void; onClose: () => void }) {
  const t = useT()
  const left = useAppStore((s) => s.adsLeftToday)()

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('adPromptTitle', { n: AD_REWARD })}
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', border: '2px solid #000', padding: 16, margin: 16, maxWidth: 320 }}>
        <p style={{ marginTop: 0 }}>
          <b>{t('adPromptTitle', { n: AD_REWARD })}</b>
        </p>
        <p>
          <small>{left > 0 ? t('adsLeft', { n: left }) : t('dailyLimit')}</small>
        </p>
        {left > 0 && <button onClick={onWatch}>{t('adPromptWatch')}</button>}{' '}
        <button onClick={onClose}>{left > 0 ? t('adPromptLater') : t('close')}</button>
      </div>
    </div>
  )
}
