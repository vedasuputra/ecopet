import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import { useFadeClose } from '../lib/useFadeClose'
import { getReferral } from '../store/economy'
import './referral.css'

// Your referral code: friends who sign up with it get 20 bonus coins, and you get a new voucher (valid 7 days) for each friend.
export default function ReferralPopup({ onClose: closeNow }: { onClose: () => void }) {
  const t = useT()
  const [closing, onClose] = useFadeClose(closeNow)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [info, setInfo] = useState<{ code: string; joined: number } | 'error' | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  useEffect(() => {
    void getReferral().then((r) => setInfo(r.ok && r.code ? { code: r.code, joined: r.joined ?? 0 } : 'error'))
  }, [])

  const copy = async () => {
    if (!info || info === 'error') return
    try {
      await navigator.clipboard.writeText(info.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* no clipboard access: the code is on the screen to be copied by hand */
    }
  }

  return (
    <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('refTitle')} onClick={onClose}>
      <div className="popup-card ref-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          <div className="popup-titles">
            <h3>{t('refTitle')}</h3>
          </div>
          <button ref={closeBtn} className="popup-close" onClick={onClose} aria-label={t('close')} title={t('close')}>
            <span className="mi" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <p className="ref-body">{t('refBody')}</p>

        {info === null ? (
          <p className="ref-note">{t('supLoading')}</p>
        ) : info === 'error' ? (
          <p className="ref-note ref-bad">{t('refFailed')}</p>
        ) : (
          <>
            <div className="ref-code-box">
              <span className="ref-label">{t('refCodeLabel')}</span>
              <span className="ref-code">{info.code}</span>
              <button className="ref-copy" onClick={() => void copy()}>
                <span className="mi" aria-hidden="true">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? t('refCopied') : t('refCopy')}
              </button>
            </div>
            <p className="ref-note">{t('refJoined', { n: info.joined })}</p>
          </>
        )}
      </div>
    </div>
  )
}
