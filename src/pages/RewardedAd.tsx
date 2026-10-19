import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMA_AD_TAG, loadIma, withCorrelator } from '../lib/ima'
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
  const { claimAd, adsLeftToday } = useAppStore()
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
    setMsg(why ? `${why} Memakai iklan contoh.` : '')
    setSimLeft(SIM_SECONDS)
    setPhase('sim')
  }

  // Simulated ad countdown. Coins are granted the moment the ad completes.
  useEffect(() => {
    if (phase !== 'sim') return
    if (simLeft <= 0) {
      setMsg(claimAd() ? `+${AD_REWARD} koin!` : 'Batas harian tercapai.')
      setPhase('simdone')
      return
    }
    const t = setTimeout(() => setSimLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, simLeft, claimAd])

  // Real ad: runs once the overlay (phase 'ima') is mounted so IMA can measure the container.
  useEffect(() => {
    if (phase !== 'ima') return
    let dead = false
    let adsManager: any
    let adsLoader: any
    let started = false
    const timer = setTimeout(() => {
      if (!started) fail('Iklan tidak merespons (timeout).')
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
          fail('Google tidak mengembalikan iklan (no fill / error).'),
        )
        adsLoader.addEventListener(ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, (e: any) => {
          if (dead) return
          adsManager = e.getAdsManager(videoEl.current)
          adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, () => fail('Iklan gagal diputar.'))
          adsManager.addEventListener(ima.AdEvent.Type.STARTED, () => {
            started = true
            clearTimeout(timer)
          })
          adsManager.addEventListener(ima.AdEvent.Type.COMPLETE, () => {
            if (dead) return
            setMsg(claimAd() ? `+${AD_REWARD} koin!` : 'Batas harian tercapai.')
            // Auto-close shortly after completion
            setTimeout(() => {
              cleanup.current()
              setPhase('done')
            }, 1200)
          })
          adsManager.addEventListener(ima.AdEvent.Type.SKIPPED, () => {
            cleanup.current()
            setMsg('Iklan dilewati, tidak ada koin.')
            setPhase('done')
          })
          try {
            adsManager.init(box.clientWidth, box.clientHeight, ima.ViewMode.NORMAL)
            adsManager.start()
          } catch {
            fail('Iklan gagal diputar.')
          }
        })

        const req = new ima.AdsRequest()
        req.adTagUrl = withCorrelator(IMA_AD_TAG)
        req.linearAdSlotWidth = box.clientWidth
        req.linearAdSlotHeight = box.clientHeight
        adsLoader.requestAds(req)
      })
      .catch(() => fail('Iklan tidak bisa dimuat (mungkin diblokir).'))

    return () => cleanup.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const start = () => {
    if (adsLeftToday() <= 0) return setMsg('Batas harian tercapai.')
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
      <h2>Iklan berhadiah</h2>
      <p>Sisa hari ini: {adsLeftToday()}</p>
      {phase === 'idle' && (
        <>
          <button onClick={start}>Tonton iklan (+{AD_REWARD} koin)</button>
          <div>
            <label style={{ fontSize: 12 }}>
              <input type="checkbox" checked={forceDemo} onChange={(e) => setForceDemo(e.target.checked)} />{' '}
              Pakai iklan contoh (demo)
            </label>
          </div>
        </>
      )}
      {msg && <p>{msg}</p>}
      <button onClick={() => navigate('/quests')}>Kembali</button>

      {/* Real ad (IMA): fills the phone frame, no close button until it completes */}
      {phase === 'ima' && (
        <div style={overlay}>
          <video ref={videoEl} playsInline style={{ position: 'absolute', width: '100%', height: '100%' }} />
          <div ref={adBox} style={{ position: 'absolute', inset: 0 }} />
          <p style={{ position: 'absolute', bottom: 4, left: 8, fontSize: 11, margin: 0 }}>Memuat iklan...</p>
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
              aria-label="Tutup iklan"
              onClick={() => setPhase('done')}
              style={{ position: 'absolute', top: 8, right: 8, fontSize: 20 }}
            >
              ✕
            </button>
          )}
          <p style={{ fontSize: 12, opacity: 0.7 }}>Iklan contoh</p>
          <h2>Cafe Sen Xanh</h2>
          <p>Kopi kelapa khas Can Tho. Tukar kupon di Eco-Pet untuk diskon 15%.</p>
          <div style={{ width: '80%', height: 6, background: '#444', marginTop: 24 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#4caf50', transition: 'width 1s linear' }} />
          </div>
          <p style={{ fontSize: 12 }}>
            {phase === 'sim' ? `Hadiah dalam ${simLeft} detik` : `Selesai! ${msg}`}
          </p>
        </div>
      )}
    </div>
  )
}
