import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CameraCapture, { type Captured } from '../components/CameraCapture'
import { quests } from '../data/quests'
import { useLoc, useT, type Key } from '../i18n'
import { failureMessage, verifyQuest } from '../lib/api'
import { formatDistance, haversine } from '../lib/geo'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

const LOC_STATUS_KEY: Record<string, Key> = {
  denied: 'locDenied',
  unsupported: 'locUnsupported',
  error: 'locError',
}

export default function QuestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const loc = useLoc()
  const quest = quests.find((q) => q.id === id)
  const { lat, lng, placeName, source, status, userChose, startReal } = useLocation()
  const { questStatus, completeQuest } = useAppStore()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  // The photo is stamped with the location at the moment it was taken.
  const [photo, setPhoto] = useState<(Captured & { lat: number; lng: number }) | null>(null)

  if (!quest) {
    return (
      <p>
        {t('questNotFound')} <Link to="/quests">{t('back')}</Link>
      </p>
    )
  }
  const done = questStatus[quest.id] === 'done'
  const needsPhoto = !!(quest.requiredObject || quest.requiredScene)

  const checkLocation = () => {
    const d = haversine(lat, lng, quest.lat, quest.lng)
    if (d > quest.radiusM) {
      setMsg(t('tooFar', { d: formatDistance(d) }))
      return false
    }
    setMsg(t('locationOk'))
    return true
  }

  // Opening the camera asks for camera permission (inside CameraCapture) and, unless the user
  // deliberately picked a simulated spot, location permission too.
  const openCamera = () => {
    if (!userChose && source !== 'real') startReal()
    setMsg('')
    setCameraOpen(true)
  }

  const verify = async () => {
    if (!needsPhoto) {
      // e.g. "redeem coupon" quest completes via VendorScan instead
      return setMsg(t('autoQuest'))
    }
    if (!checkLocation()) return
    if (!photo) return setMsg(t('pickPhoto'))
    setBusy(true)
    setMsg(t('checkingPhoto'))
    const r = await verifyQuest({
      questId: quest.id,
      image: photo.base64,
      lat: photo.lat,
      lng: photo.lng,
      timestamp: photo.at,
    })
    setBusy(false)
    if (r.ok) {
      completeQuest(quest.id)
      return setMsg(t('verified', { n: quest.rewardCoins }))
    }
    // Server sends reason codes; texts are translated here.
    switch (r.reason) {
      case 'too_far':
        return setMsg(t('tooFar', { d: formatDistance(Number(r.distanceM ?? 0)) }))
      case 'stale':
        return setMsg(t('photoStale'))
      case 'duplicate':
        return setMsg(t('photoDuplicate'))
      case 'screenshot':
        return setMsg(t('photoScreenshot'))
      case 'not_detected':
        return setMsg(t('photoNoMatch', { reason: String(r.detail ?? '') }))
      default:
        return setMsg(failureMessage(r, t, 'verifyFailed'))
    }
  }

  return (
    <div>
      <h2>{loc(quest.title)}</h2>
      <p>{loc(quest.description)}</p>
      <p>
        {t('destination')}: {quest.destination} | {t('radius')} {quest.radiusM} m | {t('rewardCoins', { n: quest.rewardCoins })}
      </p>
      <p>{source === 'simulated' ? t('simulatedAt', { place: placeName }) : t('realAt', { place: placeName })}</p>
      {LOC_STATUS_KEY[status] && <p>{t(LOC_STATUS_KEY[status])}</p>}
      <button onClick={checkLocation}>{t('checkLocation')}</button>

      {needsPhoto && !done && (
        <div>
          {cameraOpen ? (
            <CameraCapture
              onCapture={(c) => {
                setPhoto({ ...c, lat, lng })
                setCameraOpen(false)
                setMsg(t('photoTaken'))
              }}
              onCancel={() => setCameraOpen(false)}
            />
          ) : (
            <>
              {photo && <img src={photo.preview} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'contain' }} />}
              <div>
                <button onClick={openCamera} disabled={busy}>
                  {photo ? t('retake') : t('takePhoto')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!cameraOpen && (
        <button onClick={verify} disabled={done || busy}>
          {done ? t('alreadyCompleted') : t('verify')}
        </button>
      )}
      {msg && <p>{msg}</p>}
      <button onClick={() => navigate('/quests')}>{t('back')}</button>
    </div>
  )
}
