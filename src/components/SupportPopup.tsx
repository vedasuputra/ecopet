import { useEffect, useMemo, useRef, useState } from 'react'
import { areaOf } from '../data/areas'
import { useLoc, useT, type Key } from '../i18n'
import { supportApi } from '../lib/api'
import { useFadeClose } from '../lib/useFadeClose'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import FilterDropdown from './FilterDropdown'
import './support.css'

type Category = 'shop_closed' | 'shop_refused' | 'wrong_deal' | 'coupon_problem' | 'coins_problem' | 'other'
const CATEGORIES: { id: Category; key: Key; coupon: boolean }[] = [
  { id: 'shop_closed', key: 'supCatShopClosed', coupon: true },
  { id: 'shop_refused', key: 'supCatShopRefused', coupon: true },
  { id: 'wrong_deal', key: 'supCatWrongDeal', coupon: true },
  { id: 'coupon_problem', key: 'supCatCouponProblem', coupon: true },
  { id: 'coins_problem', key: 'supCatCoins', coupon: false },
  { id: 'other', key: 'supCatOther', coupon: false },
]
const MIN_CHARS = 10

interface Ticket {
  id: number
  category: Category
  coupon_id: string | null
  message: string
  status: 'open' | 'resolved' | 'rejected'
  resolution: 'refund' | 'extend' | 'none' | null
  refunded_coins: number | null
  admin_note: string | null
  created_at: string
}

// Customer service, as a popup over the profile. Two views: a form to report a problem (what happened, which coupon, and a
// reason that is required so nobody reports just like that) and the list of your reports with the answers of the team.
export default function SupportPopup({ onClose: closeNow }: { onClose: () => void }) {
  const t = useT()
  const loc = useLoc()
  const [closing, onClose] = useFadeClose(closeNow)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [view, setView] = useState<'new' | 'mine'>('new')
  const [category, setCategory] = useState<Category>('shop_closed')
  const [couponUid, setCouponUid] = useState('none')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const ownedCoupons = useAppStore((s) => s.ownedCoupons)
  const coupons = useCatalog((s) => s.coupons)
  const vendors = useCatalog((s) => s.vendors)

  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && (view === 'mine' ? setView('new') : onClose())
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose, view])

  const loadMine = async () => {
    const r = await supportApi('mine')
    setTickets(r.ok ? (r.items as Ticket[]) : [])
  }
  useEffect(() => {
    if (view === 'mine') void loadMine()
  }, [view])

  const needsCoupon = CATEGORIES.find((c) => c.id === category)?.coupon ?? false
  // the coupons you have, any state: the one you could not use is often an expired one
  const options = useMemo(
    () => [
      { value: 'none', label: t('supNoCoupon') },
      ...ownedCoupons.map((oc) => {
        const c = coupons.find((x) => x.id === oc.couponId)
        const v = c && vendors.find((x) => x.id === c.vendorId)
        const where = v ? areaOf(v) || v.name : ''
        return { value: oc.uid, label: c ? loc(c.title) : oc.couponId, sub: where || undefined }
      }),
    ],
    [ownedCoupons, coupons, vendors, loc, t],
  )
  const valid = message.trim().length >= MIN_CHARS && (!needsCoupon || couponUid !== 'none')

  const send = async () => {
    if (!valid || busy) return
    setBusy(true)
    setErr('')
    const r = await supportApi('create', { category, couponUid: couponUid === 'none' ? undefined : couponUid, message: message.trim() })
    setBusy(false)
    if (!r.ok) {
      return setErr(
        r.error === 'support_limit' ? t('supErrLimit')
          : r.error === 'already_open' ? t('supErrOpen')
            : r.error === 'unreachable' ? t('unreachable')
              : t('supErrFail'),
      )
    }
    setMessage('')
    setCouponUid('none')
    setTickets(null)
    setView('mine')
  }

  const couponName = (id: string | null) => {
    const c = coupons.find((x) => x.id === id)
    return c ? loc(c.title) : ''
  }
  const statusText = (x: Ticket) =>
    x.status === 'open' ? t('supStOpen')
      : x.resolution === 'refund' ? t('supStRefund', { n: x.refunded_coins ?? 0 })
        : x.resolution === 'extend' ? t('supStExtend')
          : t('supStClosed')

  return (
    <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('supTitle')} onClick={onClose}>
      <div className="popup-card sup-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          {view === 'mine' && (
            <button className="popup-close sup-back" onClick={() => setView('new')} aria-label={t('back')} title={t('back')}>
              <span className="mi" aria-hidden="true">
                arrow_back
              </span>
            </button>
          )}
          <div className="popup-titles">
            <h3>{view === 'new' ? t('supTitle') : t('supMine')}</h3>
            {view === 'new' && <p className="popup-sub">{t('supSub')}</p>}
          </div>
          <button ref={closeBtn} className="popup-close" onClick={onClose} aria-label={t('close')} title={t('close')}>
            <span className="mi" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {view === 'new' ? (
          <>
            <div className="sup-field">
              <span className="sup-label">{t('supWhat')}</span>
              <FilterDropdown
                icon="help"
                label={t('supWhat')}
                value={category}
                onChange={(v) => setCategory(v as Category)}
                options={CATEGORIES.map((c) => ({ value: c.id, label: t(c.key) }))}
                matchWidth
              />
            </div>
            <div className="sup-field">
              <span className="sup-label">
                {t('supWhichCoupon')}
                {!needsCoupon && <span className="sup-opt"> ({t('supOptional')})</span>}
              </span>
              <FilterDropdown icon="confirmation_number" label={t('supWhichCoupon')} value={couponUid} onChange={setCouponUid} options={options} matchWidth />
            </div>
            <div className="sup-field">
              <label className="sup-label" htmlFor="sup-msg">
                {t('supTell')}
              </label>
              <textarea
                id="sup-msg"
                className="sup-text"
                rows={4}
                maxLength={500}
                required
                placeholder={t('supPlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <span className="sup-count">{message.trim().length}/500</span>
            </div>
            <p className="sup-note">{t('supHelp')}</p>
            {err && <p className="sup-err">{err}</p>}
            <div className="sup-two">
              <button className="sup-btn sup-primary" onClick={() => void send()} disabled={!valid || busy}>
                {t('supSend')}
              </button>
              <button className="sup-btn" onClick={() => setView('mine')}>
                {t('supMine')}
              </button>
            </div>
          </>
        ) : tickets === null ? (
          <p className="sup-note">{t('supLoading')}</p>
        ) : tickets.length === 0 ? (
          <p className="sup-note">{t('supEmpty')}</p>
        ) : (
          <ul className="sup-list">
            {tickets.map((x) => (
              <li key={x.id} className={`sup-item st-${x.status}`}>
                <div className="sup-item-head">
                  <span className="sup-item-cat">{t(CATEGORIES.find((c) => c.id === x.category)?.key ?? 'supCatOther')}</span>
                  <span className={`sup-chip st-${x.status}`}>{statusText(x)}</span>
                </div>
                {couponName(x.coupon_id) && <span className="sup-item-coupon">{couponName(x.coupon_id)}</span>}
                <p className="sup-item-msg">{x.message}</p>
                {x.admin_note && (
                  <p className="sup-item-reply">
                    <strong>{t('supReply')}</strong> {x.admin_note}
                  </p>
                )}
                <span className="sup-item-date">{new Date(x.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
