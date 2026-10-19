import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { coupons } from '../data/coupons'
import { vendors } from '../data/vendors'
import { useLoc, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

// New-user gift: a gacha. Three random coupons take turns being highlighted, slowing down,
// until the highlight lands on the winner. Claiming adds it to My coupons, once per account.
const MIN_STEPS = 13

const pickThree = () => [...coupons].sort(() => Math.random() - 0.5).slice(0, 3)

export default function WelcomeGift() {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const { welcomeGiftClaimed, claimWelcomeCoupon } = useAppStore()

  const candidates = useMemo(pickThree, [])
  const winnerIdx = useMemo(() => Math.floor(Math.random() * 3), [])
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'landed' | 'claimed'>('ready')
  const [active, setActive] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Already got it (e.g. page revisited): nothing to do here.
  if (welcomeGiftClaimed && phase !== 'claimed') return <Navigate to="/quests" replace />

  const spin = () => {
    setPhase('spinning')
    // Build the highlight sequence 0,1,2,0,1,2... ending exactly on the winner.
    const seq: number[] = []
    for (let i = 0; seq.length < MIN_STEPS || seq[seq.length - 1] !== winnerIdx; i++) seq.push(i % 3)

    let at = 0
    seq.forEach((idx, k) => {
      at += 70 + k * k * 3.5 // starts fast, slows down
      timers.current.push(
        setTimeout(() => {
          setActive(idx)
          if (k === seq.length - 1) setPhase('landed')
        }, at),
      )
    })
  }

  const winner = candidates[winnerIdx]
  const vendorOf = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name ?? ''

  const claim = () => {
    setPhase('claimed') // set first so the "already claimed" redirect above doesn't fire mid-claim
    claimWelcomeCoupon(winner.id)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>{t('giftTitle')}</h2>
      <p>{t('giftIntro')}</p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
        {candidates.map((c, i) => {
          const lit = active === i
          const dimmed = (phase === 'landed' || phase === 'claimed') && i !== winnerIdx
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

      {phase === 'ready' && <button onClick={spin}>{t('giftSpin')}</button>}
      {phase === 'spinning' && <button disabled>{t('giftSpinning')}</button>}

      {(phase === 'landed' || phase === 'claimed') && (
        <div>
          <p>
            {t('giftYouGot')} <b>{vendorOf(winner.vendorId)}: {loc(winner.title)}</b> ({t('giftOff', { pct: winner.discountPct })})
          </p>
          {phase === 'landed' ? (
            <button onClick={claim}>{t('giftClaim')}</button>
          ) : (
            <>
              <p>{t('giftClaimed')}</p>
              <button onClick={() => navigate('/coupons')}>{t('giftViewCoupons')}</button>
              <button onClick={() => navigate('/quests')}>{t('giftContinue')}</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
