import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { IMA_AD_TAG, loadIma, withCorrelator } from '../lib/ima'
import { claimAd, type ActionResult } from '../store/economy'
import { AD_REWARD, useAppStore } from '../store/useAppStore'

type Phase = 'idle' | 'ima' | 'sim' | 'simdone' | 'done'

const IMA_START_TIMEOUT_MS = 10000
const SIM_SECONDS = 25 // demo ad length (20-30s)

// Rewarded video through Google's IMA SDK, rendered in OUR container inside the phone frame.
// Coins are granted by us when the ad completes (AdEvent.COMPLETE); there is no X until then.
// If the ad can't load (blocked, no fill, error, timeout) or "demo ad" is on, a simulated
// 25s ad plays instead, with the X hidden until it finishes.
export default function RewardedAd() {
  const navigate = useNavigate()
  const t = useT()
  const adsLeftToday = useAppStore((s) => s.adsLeftToday)
  useAppStore((s) => s.adWatch) // re-render when the server-side count changes
  // The server pays the coins (and enforces 3 a day); we only show the outcome.
  const rewardMsg = (r: ActionResult) =>
    r.ok ? t('coinsGot', { n: AD_REWARD }) : r.error === 'daily_limit' ? t('dailyLimit') : r.error === 'unreachable' ? t('unreachable') : t('serverError')
  const [phase, setPhase] = useState<Phase>('idle')
  const [msg, setMsg] = useState('')
  const [simLeft, setSimLeft] = useState(SIM_SECONDS)
  const [forceDemo, setForceDemo] = useState(false)
  const adBox = useRef<HTMLDivElement>(null)
  const videoEl = useRef<HTMLVideoElement>(null)
  const cleanup = useRef<() => void>(() => {})

  useEffect(() => () => cleanup.current(), [])

  const fallback = (why: string) => {
    cleanup.current()
    setMsg(why ? t('usingDemo', { why }) : '')
    setSimLeft(SIM_SECONDS)
    setPhase('sim')
  }

  // Simulated ad countdown. Coins are granted the moment the ad completes.
  useEffect(() => {
    if (phase !== 'sim') return
    if (simLeft <= 0) {
      setPhase('simdone')
      void claimAd().then((r) => setMsg(rewardMsg(r)))
      return
    }
    const tick = setTimeout(() => setSimLeft((s) => s - 1), 1000)
    return () => clearTimeout(tick)
  }, [phase, simLeft, t])

  // Real ad: runs once the overlay (phase 'ima') is mounted so IMA can measure the container.
  useEffect(() => {
    if (phase !== 'ima') return
    let dead = false
    let adsManager: any
    let adsLoader: any
    let started = false
    const timer = setTimeout(() => {
      if (!started) fail(t('adTimeout'))
    }, IMA_START_TIMEOUT_MS)

    const fail = (why: string) => {
      if (dead) return
      clearTimeout(timer)
      fallback(why)
    }
    cleanup.current = () => {
      dead = true
      clearTimeout(timer)
      try {
        adsManager?.destroy()
        adsLoader?.destroy()
      } catch {
        /* already destroyed */
      }
      cleanup.current = () => {}
    }

    loadIma()
      .then((ima) => {
        if (dead || !adBox.current || !videoEl.current) return
        const box = adBox.current
        const displayContainer = new ima.AdDisplayContainer(box, videoEl.current)
        displayContainer.initialize()
        adsLoader = new ima.AdsLoader(displayContainer)

        adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () =>
          fail(t('adNoFill')),
        )
        adsLoader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e: any) => {
          if (dead) return
          adsManager = e.getAdsManager(videoEl.current)
          adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => fail(t('adPlayFail')))
          adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => {
            started = true
            clearTimeout(timer)
          })
          adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
            if (dead) return
            void claimAd().then((r) => setMsg(rewardMsg(r)))
            // Auto-close shortly after completion
            setTimeout(() => {
              cleanup.current()
              setPhase('done')
            }, 1200)
          })
          adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
            cleanup.current()
            setMsg(t('adSkipped'))
            setPhase('done')
          })
          try {
            adsManager.init(box.clientWidth, box.clientHeight, ima.ViewMode.NORMAL)
            adsManager.start()
          } catch {
            fail(t('adPlayFail'))
          }
        })

        const req = new ima.AdsRequest()
        req.adTagUrl = withCorrelator(IMA_AD_TAG)
        req.linearAdSlotWidth = box.clientWidth
        req.linearAdSlotHeight = box.clientHeight
        adsLoader.requestAds(req)
      })
      .catch(() => fail(t('adBlocked')))

    return () => cleanup.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const start = () => {
    if (adsLeftToday() <= 0) return setMsg(t('dailyLimit'))
    if (forceDemo) return fallback('')
    setMsg('')
    setPhase('ima')
  }

  const progress = ((SIM_SECONDS - simLeft) / SIM_SECONDS) * 100
  const overlay: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    background: '#000',
    color: '#fff',
  }

  return (
    <div>
      <h2>{t('adTitle')}</h2>
      <p>{t('adsLeft', { n: adsLeftToday() })}</p>
      {phase === 'idle' && (
        <>
          <button onClick={start}>{t('watchAd', { n: AD_REWARD })}</button>
          <div>
            <label style={{ fontSize: 12 }}>
              <input type="checkbox" checked={forceDemo} onChange={(e) => setForceDemo(e.target.checked)} />{' '}
              {t('demoAd')}
            </label>
          </div>
        </>
      )}
      {msg && <p>{msg}</p>}
      <button onClick={() => navigate('/home')}>{t('back')}</button>

      {/* Real ad (IMA): fills the phone frame, no close button until it completes */}
      {phase === 'ima' && (
        <div style={overlay}>
          <video ref={videoEl} playsInline style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <div ref={adBox} style={{ position: 'absolute', inset: 0 }} />
          <p style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 11, margin: 0 }}>{t('adLoading')}</p>
        </div>
      )}

      {/* Simulated video ad: also fills the phone frame, X appears only once finished */}
      {(phase === 'sim' || phase === 'simdone') && (
        <div
          style={{
            ...overlay,
            background: '#111',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: 16,
          }}
        >
          {phase === 'simdone' && (
            <button
              aria-label={t('closeAd')}
              onClick={() => setPhase('done')}
              style={{ position: 'absolute', top: 8, right: 8, fontSize: 20 }}
            >
              ✕
            </button>
          )}
          <p style={{ fontSize: 12, opacity: 0.7 }}>{t('adSample')}</p>
          <h2>{t('adSampleTitle')}</h2>
          <p>{t('adSampleBody')}</p>
          <div style={{ width: '80%', height: 6, background: '#444', marginTop: 24 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#4caf50', transition: 'width 1s linear' }} />
          </div>
          <p style={{ fontSize: 12 }}>
            {phase === 'sim' ? t('rewardIn', { n: simLeft }) : t('adFinished', { msg })}
          </p>
        </div>
      )}
    </div>
  )
}
