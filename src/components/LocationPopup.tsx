import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useLocation } from '../store/useLocation'
import { ChangeLocationView, RealLocationView } from './LocationViews'

type View = 'main' | 'real' | 'change'

// The popup behind the location pill in the top bar. It shows where the app thinks you are and two buttons; each button
// opens another view inside the same popup (use the real location, or pick another place), with a back arrow.
export default function LocationPopup({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [view, setView] = useState<View>('main')
  const { source, placeName } = useLocation()
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtn.current?.focus()
  }, [view])
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && (view === 'main' ? onClose() : setView('main'))
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose, view])

  const title = view === 'real' ? t('locRealShort') : view === 'change' ? t('changeLocation') : t('settingsLocation')

  return (
    <div className="popup-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          {view !== 'main' && (
            <button className="popup-close popup-back" onClick={() => setView('main')} aria-label={t('back')} title={t('back')}>
              <span className="mi" aria-hidden="true">
                arrow_back
              </span>
            </button>
          )}
          <div className="popup-titles">
            <h3>{title}</h3>
            <p className="popup-sub">{source === 'simulated' ? t('locSimulatedParen', { place: placeName }) : t('locRealParen', { place: placeName })}</p>
          </div>
          <button ref={closeBtn} className="popup-close" onClick={onClose} aria-label={t('close')} title={t('close')}>
            <span className="mi" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {view === 'main' && (
          <>
            <p className="popup-hint">{t('settingsLocationHint')}</p>
            <div className="popup-actions">
              <button className="popup-btn" onClick={() => setView('real')}>
                {t('locRealShort')}
              </button>
              <button className="popup-btn" onClick={() => setView('change')}>
                {t('changeLocation')}
              </button>
            </div>
          </>
        )}
        {view === 'real' && <RealLocationView />}
        {view === 'change' && <ChangeLocationView />}
      </div>
    </div>
  )
}
