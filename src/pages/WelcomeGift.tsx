import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Confetti from '../components/Confetti'
import CouponTicket from '../components/CouponTicket'
import { couponCategory } from '../data/couponCategory'
import type { Coupon } from '../data/coupons'
import { dealShort } from '../data/deal'
import { useLoc, useT } from '../i18n'
import { useFadeClose } from '../lib/useFadeClose'
import { claimWelcome } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import './welcomegift.css'

// New-user gift, as a popup over Home. The three cheapest coupons are shown BEFORE the spin; the SERVER draws one of them (once per
// account) and the highlight then runs over the three, slowing down until it lands on the winner. The coupon is already in
// My coupons when the animation ends.
const MIN_STEPS = 13

const byPriceThenId = (a: Coupon, b: Coupon) => a.costCoins - b.costCoins || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export default function WelcomeGift() {
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const welcomeGiftClaimed = useAppStore((s) => s.welcomeGiftClaimed)
  const { coupons, vendors } = useCatalog()
  const [phase, setPhase] = useState<'ready' | 'spinning' | 'landed' | 'done'>('ready')
  const [error, setError] = useState('')
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [closing, close] = useFadeClose(() => navigate('/home', { replace: true }))

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // the three cheapest coupons of shops that are in the catalog (the same three the server draws from)
  const pool = useMemo(() => coupons.filter((c) => c.active !== false && vendors.some((v) => v.id === c.vendorId)).sort(byPriceThenId).slice(0, 3), [coupons, vendors])
  // if the server's winner is not one of the three we show (the catalog was out of date), the winner takes the last place
  const shown = useMemo(() => {
    const w = winnerId ? coupons.find((c) => c.id === winnerId) : undefined
    return w && !pool.some((c) => c.id === w.id) ? [...pool.slice(0, 2), w] : pool
  }, [pool, winnerId, coupons])

  // Already got it (e.g. page revisited): nothing to do here.
  if (welcomeGiftClaimed && phase === 'ready') return <Navigate to="/home" replace />

  const spin = async () => {
    setPhase('spinning')
    setError('')
    const r = await claimWelcome()
    if (!r.ok) {
      if (r.error === 'already_claimed') return navigate('/home', { replace: true })
      setPhase('ready')
      return setError(r.error === 'unreachable' ? t('unreachable') : t('couponGetFail'))
    }
    const id = String(r.couponId)
    if (!coupons.some((c) => c.id === id)) return navigate('/coupons', { replace: true }) // won, but not in our catalog yet: it is in My coupons
    setWinnerId(id)
    const list = pool.some((c) => c.id === id) ? pool : [...pool.slice(0, 2), coupons.find((c) => c.id === id)!]
    const winnerIdx = list.findIndex((c) => c.id === id)

    // highlight sequence 0,1,2,0,1,2... ending exactly on the winner
    const n = list.length
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
            // a moment to see where it landed, then the congratulations
            timers.current.push(setTimeout(() => setPhase('done'), 1100))
          }
        }, at),
      )
    })
  }

  const vendorOf = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name ?? ''
  const winner = winnerId ? coupons.find((c) => c.id === winnerId) : undefined

  const winnerVendor = winner ? vendors.find((v) => v.id === winner.vendorId) : undefined

  // the congratulations: white confetti behind a card with the coupon that was won
  if (phase === 'done' && winner) {
    return (
      <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('giftCongrats')}>
        <Confetti />
        <div className="popup-card gift-popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-head">
            <div className="popup-titles">
              <h3>{t('giftCongrats')}</h3>
            </div>
          </div>
          <p className="gift-intro gift-center">{t('giftCongratsBody')}</p>
          <ul className="gift-list">
            <CouponTicket
              title={loc(winner.title)}
              shop={vendorOf(winner.vendorId)}
              category={couponCategory(winnerVendor?.category.en ?? '', winnerVendor?.kind)}
              deal={dealShort(winner, t)}
              dealIsWord={winner.dealType === 'free' || winner.dealType === 'combo'}
            />
          </ul>
          <div className="gift-two">
            <button className="gift-btn" onClick={() => navigate('/coupons', { replace: true })}>
              {t('giftViewCoupons')}
            </button>
            <button className="gift-btn gift-primary" onClick={close}>
              {t('giftContinue')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('giftTitle')}>
      <div className="popup-card gift-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          <div className="popup-titles">
            <h3>{t('giftTitle')}</h3>
          </div>
        </div>

        <p className="gift-intro">{t('giftIntroThree')}</p>

        <ul className={`gift-list${phase === 'landed' ? ' landed' : ''}`}>
          {shown.map((c, i) => (
            <CouponTicket
              key={c.id}
              title={loc(c.title)}
              shop={vendorOf(c.vendorId)}
              category={couponCategory(vendors.find((v) => v.id === c.vendorId)?.category.en ?? '', vendors.find((v) => v.id === c.vendorId)?.kind)}
              deal={dealShort(c, t)}
              dealIsWord={c.dealType === 'free' || c.dealType === 'combo'}
              lit={active === i && (phase === 'spinning' || phase === 'landed')}
              faded={(phase === 'spinning' || phase === 'landed') && active !== i}
            />
          ))}
        </ul>

        {error && <p className="gift-error">{error}</p>}
        {phase === 'ready' && (
          <button className="gift-btn gift-primary" onClick={() => void spin()} disabled={shown.length === 0}>
            {t('giftSpin')}
          </button>
        )}
        {(phase === 'spinning' || phase === 'landed') && (
          <button className="gift-btn gift-primary" disabled>
            {t('giftSpinning')}
          </button>
        )}
      </div>
    </div>
  )
}
