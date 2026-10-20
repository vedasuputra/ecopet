import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useLoc, useT } from '../i18n'
import { claimWelcome } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import { useCatalog, } from '../store/useCatalog'
import { useCelebration } from '../store/useCelebration'
import type { Coupon } from '../data/coupons'

// New-user gift: a gacha. The SERVER draws the winning coupon (once per account); three coupons
// (the winner plus two decoys) then take turns being highlighted, slowing down until the highlight
// lands on the winner. The coupon is already in My coupons when the animation ends.
const MIN_STEPS = 13

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

export default function WelcomeGift() {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const welcomeGiftClaimed = useAppStore((s) => s.welcomeGiftClaimed)
  const { coupons, vendors } = useCatalog()
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'landed'>('ready')
  const [error, setError] = useState('')
  const [reel, setReel] = useState<{ candidates: Coupon[]; winnerIdx: number } | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Already got it (e.g. page revisited): nothing to do here.
  if (welcomeGiftClaimed && phase === 'ready') return <Navigate to="/quests" replace />

  const spin = async () => {
    setPhase('spinning')
    setError('')
    const r = await claimWelcome()
    if (!r.ok) {
      if (r.error === 'already_claimed') return navigate('/home', { replace: true })
      setPhase('ready')
      return setError(r.error === 'unreachable' ? t('unreachable') : t('couponGetFail'))
    }

    const winner = coupons.find((c) => c.id === r.couponId)
    if (!winner) return navigate('/coupons', { replace: true }) // won, but not in our catalog yet: it is in My coupons
    const decoys = shuffle(coupons.filter((c) => c.id !== winner.id && c.active !== false)).slice(0, 2)
    const candidates = shuffle([winner, ...decoys])
    const winnerIdx = candidates.findIndex((c) => c.id === winner.id)
    setReel({ candidates, winnerIdx })

    // highlight sequence 0,1,2,0,1,2... ending exactly on the winner
    const n = candidates.length
    const seq: number[] = []
    for (let i = 0; seq.length < MIN_STEPS || seq[seq.length - 1] !== winnerIdx; i++) seq.push(i % n)
    let at = 0
    seq.forEach((idx, k) => {
      at += 70 + k * k * 3.5 // starts fast, slows down
      timers.current.push(
        setTimeout(() => {
          setActive(idx)
          if (k === seq.length - 1) {
            setPhase('landed')
            useCelebration.getState().show(t('celebrateGift'))
          }
        }, at),
      )
    })
  }

  const vendorOf = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name ?? ''
  const winner = reel ? reel.candidates[reel.winnerIdx] : null

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>{t('giftTitle')}</h2>
      <p>{t('giftIntro')}</p>

      {reel && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
          {reel.candidates.map((c, i) => {
            const lit = active === i
            const dimmed = phase === 'landed' && i !== reel.winnerIdx
            return (
              <div
                key={c.id}
                style={{
                  width: 100,
                  padding: 8,
                  border: lit ? '3px solid #000' : '1px solid #999',
                  background: lit ? '#ffe680' : '#fff',
                  opacity: dimmed ? 0.35 : 1,
                  fontSize: 12,
                }}
              >
                <b>{vendorOf(c.vendorId)}</b>
                <div>{loc(c.title)}</div>
                <div>{t('giftOff', { pct: c.discountPct })}</div>
              </div>
            )
          })}
        </div>
      )}

      {error && <p>{error}</p>}
      {phase === 'ready' && <button onClick={spin}>{t('giftSpin')}</button>}
      {phase === 'spinning' && <button disabled>{t('giftSpinning')}</button>}

      {phase === 'landed' && winner && (
        <div>
          <p>
            {t('giftYouGot')} <b>{vendorOf(winner.vendorId)}: {loc(winner.title)}</b> ({t('giftOff', { pct: winner.discountPct })})
          </p>
          <p>{t('giftClaimed')}</p>
          <button onClick={() => navigate('/coupons')}>{t('giftViewCoupons')}</button>
          <button onClick={() => navigate('/home')}>{t('giftContinue')}</button>
        </div>
      )}
    </div>
  )
}
