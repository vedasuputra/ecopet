import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'
import './camera.css'

const MAX_SIDE = 1024
const QUALITY = 0.8

export interface Captured {
  base64: string // JPEG, no data: prefix
  preview: string // data URL for showing the photo
  at: number // capture time (ms)
}

// Live in-app camera. The photo can only come from this camera (no gallery / file picker),
// which is what makes the timestamp and "taken right here, right now" checks meaningful.
export default function CameraCapture({
  onCapture,
  onCancel,
}: {
  onCapture: (c: Captured) => void
  onCancel: () => void
}) {
  const t = useT()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let dead = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t('cameraUnsupported'))
      return
    }
    // Triggers the browser's camera permission prompt straight away.
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (dead) return s.getTracks().forEach((x) => x.stop())
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          void video.current.play().then(() => setReady(true))
        }
      })
      .catch((e: DOMException) => setError(e.name === 'NotAllowedError' ? t('cameraDenied') : t('cameraError')))
    return () => {
      dead = true
      stream.current?.getTracks().forEach((x) => x.stop())
    }
  }, [t])

  const snap = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(v.videoWidth * scale)
    c.height = Math.round(v.videoHeight * scale)
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
    const dataUrl = c.toDataURL('image/jpeg', QUALITY)
    stream.current?.getTracks().forEach((x) => x.stop())
    onCapture({ base64: dataUrl.split(',')[1], preview: dataUrl, at: Date.now() })
  }

  return (
    <div className="cam">
      {error ? (
        <p className="cam-note cam-bad">{error}</p>
      ) : (
        <>
          <video ref={video} className="cam-video" playsInline muted />
          {!ready && <p className="cam-note">{t('cameraStarting')}</p>}
        </>
      )}
      <div className="cam-row">
        <button className="cam-btn cam-primary" onClick={snap} disabled={!ready || !!error}>
          <span className="mi" aria-hidden="true">
            photo_camera
          </span>
          {t('capture')}
        </button>
        <button className="cam-btn" onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
