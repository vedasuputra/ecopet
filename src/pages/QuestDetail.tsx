import { useEffect, useRef, useState } from 'react'
import { useLocation as useRoute, useNavigate, useParams } from 'react-router-dom'
import CameraCapture, { type Captured } from '../components/CameraCapture'
import { useCatalog } from '../store/useCatalog'
import { useLoc, useT, type Key } from '../i18n'
import { failureMessage, reportAttempt, verifyQuest } from '../lib/api'
import { formatDistance, haversine } from '../lib/geo'
import { refreshEconomy } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import { useCelebration } from '../store/useCelebration'
import { useLocation } from '../store/useLocation'
import { QUEST_ICON } from '../data/questIcons'
import Home from './Home'
import Quests from './Quests'
import './questdetail.css'

const LOC_STATUS_KEY: Record<string, Key> = {
  denied: 'locDenied',
  unsupported: 'locUnsupported',
  error: 'locError',
}

export default function QuestDetail() {
  const quests = useCatalog((s) => s.quests)
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const loc = useLoc()
  const quest = quests.find((q) => q.id === id)
  const { lat, lng, placeName, source, status, userChose, startReal } = useLocation()
  const questStatus = useAppStore((s) => s.questStatus)
  const pinned = useAppStore((s) => s.pinnedQuestIds.includes(id ?? ''))
  const togglePin = useAppStore((s) => s.togglePin)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const review = useAppStore((s) => s.reviewStatus[id ?? ''])
  const [msg, setMsg] = useState('')
  const [reportErr, setReportErr] = useState('') // why a report could not be sent (shown in the report popup)
  const [msgKind, setMsgKind] = useState<'info' | 'bad' | 'ok'>('info')
  // what the check said about the photo: nothing yet (it was just taken), wrong, waiting for a person, or fine
  const [photoStatus, setPhotoStatus] = useState<'bad' | 'review' | 'ok' | null>(null)
  // the result of the last location check; it only counts while you are still at the spot it was made
  const [locCheck, setLocCheck] = useState<{ ok: boolean; lat: number; lng: number; text: string; place: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  // the AI rejected the photo: the traveler may report that it was wrong
  const [report, setReport] = useState<{ attemptId: number; open: boolean; note: string; sent: boolean; busy: boolean } | null>(null)
  // The photo is stamped with the location at the moment it was taken.
  const [photo, setPhoto] = useState<(Captured & { lat: number; lng: number }) | null>(null)

  // always back to the list of quests (going "back" in the history could lead nowhere, e.g. after a refresh)
  const fromHome = (useRoute().state as { from?: string } | null)?.from === 'home'
  const close = () => navigate(fromHome ? '/' : '/quests', { replace: true })
  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the quests stay behind the popup, dimmed
  const shell = (body: React.ReactNode, overlay?: React.ReactNode) => (
    <>
      {fromHome ? <Home /> : <Quests />}
      <div className="popup-backdrop" role="dialog" aria-modal="true" aria-label={t('questDetailHeading')} onClick={close} hidden={!!overlay}>
        <div className="popup-card qd-popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-head">
            <div className="popup-titles">
              <h3>{t('questDetailHeading')}</h3>
            </div>
            {quest && (
              <button
                className={`popup-close qd-pinbtn${pinned ? ' on' : ''}`}
                aria-pressed={pinned}
                onClick={() => togglePin(quest.id)}
                aria-label={pinned ? t('questUnpin') : t('questPin')}
                title={pinned ? t('questUnpin') : t('questPin')}
              >
                <span className="mi" aria-hidden="true">
                  push_pin
                </span>
              </button>
            )}
            <button ref={closeBtn} className="popup-close" onClick={close} aria-label={t('close')} title={t('close')}>
              <span className="mi" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          {body}
        </div>
      </div>
      {overlay}
    </>
  )

  if (!quest) return shell(<p className="qd-note">{t('questNotFound')}</p>)
  const done = questStatus[quest.id] === 'done'
  const needsPhoto = !!(quest.requiredObject || quest.requiredScene)
  const general = quest.scope === 'general'

  const checkLocation = () => {
    if (general) return true // doable anywhere
    const d = haversine(lat, lng, quest.lat, quest.lng)
    const ok = d <= quest.radiusM
    setLocCheck({ ok, lat, lng, text: t('locStepFar', { d: formatDistance(d) }), place: placeName })
    return ok
  }
  const locState = general ? null : locCheck && locCheck.lat === lat && locCheck.lng === lng ? locCheck : null
  // the quest is completed only when BOTH are good: you are at the place and the photo shows the thing
  const locDone = general || !!locState?.ok
  const photoDone = !needsPhoto || !!photo
  const stepIcon = (ok: boolean | null) => (ok === null ? 'radio_button_unchecked' : ok ? 'check_circle' : 'error')

  // Opening the camera asks for camera permission (inside CameraCapture) and, unless the user
  // deliberately picked a simulated spot, location permission too.
  const openCamera = () => {
    if (!userChose && source !== 'real') startReal()
    setMsg('')
    setCameraOpen(true)
  }

  const sendReport = async () => {
    if (!report || !photo) return
    setReport({ ...report, busy: true })
    const r = await reportAttempt({ attemptId: report.attemptId, image: photo.base64, note: report.note.trim() || undefined })
    if (r.ok) {
      setReport({ ...report, busy: false, open: false, sent: true })
      void refreshEconomy() // the quest now shows as "under review"
      setReportErr('')
      return say(t('reportThanks'), 'ok')
    }
    setReport({ ...report, busy: false })
    setReportErr(
      r.error === 'report_limit' ? t('reportLimit')
        : r.error === 'already_reported' ? t('reportAlready')
          : r.error === 'too_late' ? t('reportTooLate')
            : r.error === 'review_pending' ? t('photoReviewPending')
              : r.error === 'already_done' ? t('photoAlreadyDone')
                : r.error === 'unreachable' ? t('unreachable')
                  : t('reportFailed'),
    )
  }

  const say = (text: string, kind: 'info' | 'bad' | 'ok' = 'bad', photoResult?: 'bad' | 'review' | 'ok') => {
    setMsg(text)
    setMsgKind(kind)
    if (photoResult) setPhotoStatus(photoResult)
  }

  const verify = async () => {
    if (!needsPhoto) {
      // e.g. "redeem coupon" quest completes via VendorScan instead
      return setMsg(t('autoQuest'))
    }
    if (!checkLocation()) return
    if (!photo) return setMsg(t('pickPhoto'))
    setBusy(true)
    setPhotoStatus(null)
    say(t('checkingPhoto'), 'info')
    const r = await verifyQuest({
      questId: quest.id,
      image: photo.base64,
      lat: photo.lat,
      lng: photo.lng,
      timestamp: photo.at,
    })
    setBusy(false)
    setReport(typeof r.attemptId === 'number' ? { attemptId: r.attemptId, open: false, note: '', sent: false, busy: false } : null)
    if (r.ok) {
      void refreshEconomy() // the server already paid the reward
      useCelebration.getState().show(t('celebrateQuest', { n: quest.rewardCoins }))
      return say(t('verified', { n: quest.rewardCoins }), 'ok', 'ok')
    }
    // Server sends reason codes; texts are translated here.
    switch (r.reason) {
      case 'too_far':
        return say(t('tooFar', { d: formatDistance(Number(r.distanceM ?? 0)) }))
      case 'stale':
        return say(t('photoStale'), 'bad', 'bad')
      case 'already_done':
        void refreshEconomy()
        return say(t('photoAlreadyDone'))
      case 'no_evidence':
        return say(t('photoNoEvidence', { reason: String(r.detail ?? '') }), 'bad', 'bad')
      case 'duplicate':
        return say(t('photoDuplicate'), 'bad', 'bad')
      case 'screenshot':
        return say(t('photoScreenshot'), 'bad', 'bad')
      case 'suspicious':
        return say(t('photoSuspicious'), 'bad', 'bad')
      case 'review':
        void refreshEconomy() // now "under review"
        return say(t('photoUnderReview'), 'info', 'review')
      case 'review_pending':
        void refreshEconomy()
        return say(t('photoReviewPending'), 'info', 'review')
      case 'daily_limit':
        return say(t('photoDailyLimit'))
      case 'not_detected':
        return say(t('photoNoMatch', { reason: String(r.detail ?? '') }), 'bad', 'bad')
      default:
        return say(failureMessage(r, t, 'verifyFailed'))
    }
  }

  const reportOpen = !!(report && report.open && !report.sent && !done && photo)
  const noteOk = !!report && report.note.trim().length >= 10 // the reason is required, so nobody reports just like that
  const reportPopup =
    reportOpen && report && photo ? (
      <div className="popup-backdrop qd-report-backdrop" role="dialog" aria-modal="true" aria-label={t('reportHeading')} onClick={close}>
        <div className="popup-card qd-popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-head">
            <button className="popup-close qd-back" onClick={() => setReport({ ...report, open: false })} aria-label={t('back')} title={t('back')}>
              <span className="mi" aria-hidden="true">
                arrow_back
              </span>
            </button>
            <div className="popup-titles">
              <h3>{t('reportHeading')}</h3>
            </div>
            <button className="popup-close" onClick={close} aria-label={t('close')} title={t('close')}>
              <span className="mi" aria-hidden="true">
                close
              </span>
            </button>
          </div>
          <p className="qd-note qd-report-info">{t('reportInfo')}</p>
          <img className="qd-photo qd-report-photo" src={photo.preview} alt="" />
          <textarea
            className="qd-text"
            maxLength={200}
            rows={3}
            required
            placeholder={t('reportNotePlaceholder')}
            value={report.note}
            onChange={(e) => setReport({ ...report, note: e.target.value })}
          />
          <p className="qd-note qd-count">{report.note.trim().length}/200</p>
          {reportErr && <p className="qd-note qd-bad">{reportErr}</p>}
          <button className="qd-btn qd-primary" onClick={() => void sendReport()} disabled={report.busy || !noteOk}>
            {t('reportSend')}
          </button>
        </div>
      </div>
    ) : null

  return shell(
    <>
      <div className="qd-hero">
        <span className="qd-icon" aria-hidden="true">
          <span className="mi">{QUEST_ICON[quest.type]}</span>
        </span>
        <div className="qd-hero-text">
          <span className="qd-title">{loc(quest.title)}</span>
          <span className="qd-place">
            <span className="mi" aria-hidden="true">
              {general ? 'near_me' : 'location_on'}
            </span>
            {general ? t('anywhere') : quest.destination}
          </span>
        </div>
        <span className="qd-reward" aria-label={t('rewardCoins', { n: quest.rewardCoins })} title={t('rewardCoins', { n: quest.rewardCoins })}>
          <span className="mi" aria-hidden="true">
            monetization_on
          </span>
          +{quest.rewardCoins}
        </span>
      </div>

      <p className="qd-desc">{loc(quest.description)}</p>

      {!done && (
        <ol className="qd-steps">
          {!general && (
            <li className="qd-step">
              <span className={`mi qd-step-ico ${locState ? (locState.ok ? 'ok' : 'bad') : ''}`} aria-hidden="true">
                {stepIcon(locState ? locState.ok : null)}
              </span>
              <div className="qd-step-body">
                <span className="qd-step-title">{t('stepLocation')}</span>
                {locState && (
                  <>
                    <span className={`qd-step-text${locState.ok ? '' : ' qd-bad'}`}>{locState.text}</span>
                    <span className="qd-step-place">
                      <span className="mi" aria-hidden="true">
                        location_on
                      </span>
                      <span>{locState.place}</span>
                    </span>
                  </>
                )}
                {LOC_STATUS_KEY[status] && <span className="qd-step-text qd-bad">{t(LOC_STATUS_KEY[status])}</span>}
                <button className="qd-btn qd-small" onClick={checkLocation}>
                  {t('checkLocation')}
                </button>
              </div>
            </li>
          )}
          {needsPhoto && (
            <li className="qd-step">
              <span className={`mi qd-step-ico ${photoStatus === 'ok' ? 'ok' : photoStatus === 'bad' ? 'bad' : photo ? 'warn' : ''}`} aria-hidden="true">
                {photoStatus === 'ok' ? 'check_circle' : photoStatus === 'bad' ? 'cancel' : photo ? 'info' : 'radio_button_unchecked'}
              </span>
              <div className="qd-step-body">
                <span className="qd-step-title">{t('stepPhoto')}</span>
                {cameraOpen ? (
                  <CameraCapture
                    onCapture={(c) => {
                      setPhoto({ ...c, lat, lng })
                      setReport(null)
                      setPhotoStatus(null)
                      setMsg('')
                      setCameraOpen(false)
                    }}
                    onCancel={() => setCameraOpen(false)}
                  />
                ) : (
                  <>
                    {photo && <img className="qd-photo" src={photo.preview} alt="" />}
                    <button className="qd-btn qd-small" onClick={openCamera} disabled={busy}>
                      {photo ? t('retake') : t('takePhoto')}
                    </button>
                  </>
                )}
              </div>
            </li>
          )}
        </ol>
      )}

      {!done && review?.status === 'pending' && <p className="qd-note">{t('questUnderReview')}</p>}
      {!done && review?.status === 'rejected' && (
        <p className="qd-note qd-bad">{review.note ? t('questReviewRejectedNote', { note: review.note }) : t('questReviewRejected')}</p>
      )}

      {!cameraOpen && (
        <button className="qd-btn qd-primary" onClick={verify} disabled={done || busy || review?.status === 'pending' || (needsPhoto && !(locDone && photoDone))}>
          {done ? t('alreadyCompleted') : t('verify')}
        </button>
      )}
      {msg && (
        <p className={`qd-note qd-msg ${msgKind}`}>
          {msg}
          {report && !report.sent && !report.open && !done && (
            <>
              {' '}
              <button type="button" className="qd-link" onClick={() => setReport({ ...report, open: true })}>
                {t('reportLink')}
              </button>
            </>
          )}
        </p>
      )}
    </>,
    reportPopup,
  )
}
