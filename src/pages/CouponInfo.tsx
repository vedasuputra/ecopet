import { useEffect, useRef, useState } from 'react'
import { Link, useLocation as useRoute, useNavigate, useParams } from 'react-router-dom'
import ShopStatus, { DAY_KEY } from '../components/ShopStatus'
import { COUPON_CATEGORY_ICON, couponCategory } from '../data/couponCategory'
import { dealShort } from '../data/deal'
import { useLoc, useT } from '../i18n'
import { formatDistance, haversine, mapsSearchUrl } from '../lib/geo'
import { DAYS, openStatus, todayKey } from '../lib/openHours'
import { buyCoupon } from '../store/economy'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import '../components/ticket.css'
import './couponinfo.css'
import { useFadeClose } from '../lib/useFadeClose'

// Everything about a coupon before you get it, as a popup over the list of coupons (dimmed behind it): the deal and its price,
// where the shop is, when it is open, and the button to get it.
export default function CouponInfo() {
  const { id } = useParams()
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const coins = useAppStore((s) => s.coins)
  const ownedCoupons = useAppStore((s) => s.ownedCoupons)
  const coupon = useCatalog((s) => s.coupons.find((c) => c.id === id))
  const vendor = useCatalog((s) => s.vendors.find((v) => v.id === coupon?.vendorId))
  const { lat, lng } = useLocation()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  const fromHome = (useRoute().state as { from?: string } | null)?.from === 'home'
  const [closing, close] = useFadeClose(() => navigate(fromHome ? '/home' : '/coupons', { replace: true }))
  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const get = async () => {
    if (!coupon) return
    setBusy(true)
    setMsg(null)
    const r = await buyCoupon(coupon.id)
    setBusy(false)
    setMsg(
      r.ok
        ? { ok: true, text: t('couponGot') }
        : {
            ok: false,
            text:
              r.error === 'insufficient_coins'
                ? t('notEnoughCoins')
                : r.error === 'sold_out'
                  ? t('couponSoldOutMsg')
                  : r.error === 'daily_coupon_limit'
                    ? t('couponDailyLimitMsg')
                    : r.error === 'coupon_unavailable'
                      ? t('couponShopGone')
                      : r.error === 'unreachable'
                        ? t('unreachable')
                        : t('couponGetFail'),
          },
    )
  }

  const gone = !coupon ? t('couponNotFound') : !vendor ? t('couponShopGone') : null // vendors in the catalog are the paid-up ones
  const cat = couponCategory(vendor?.category.en ?? '', vendor?.kind)
  const status = openStatus(vendor?.openHours)
  const soldOut = coupon?.remaining === 0
  // a copy of this coupon you already have and can still use
  const mine = ownedCoupons.find((oc) => oc.couponId === coupon?.id && oc.status === 'unused' && !isCouponExpired(oc))
  const need = coupon && !mine ? Math.max(0, coupon.costCoins - coins) : 0
  const distance = vendor ? formatDistance(haversine(lat, lng, vendor.lat, vendor.lng)) : ''
  const today = todayKey()

  return (
    <>
      {/* the coupons stay behind the popup, dimmed */}
      <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('qrHeading')} onClick={close}>
        <div className={`popup-card info-popup cat-${cat}`} onClick={(e) => e.stopPropagation()}>
          <div className="popup-head">
            <div className="popup-titles">
              <h3>{t('qrHeading')}</h3>
            </div>
            <button ref={closeBtn} className="popup-close" onClick={close} aria-label={t('close')} title={t('close')}>
              <span className="mi" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          {gone || !coupon || !vendor ? (
            <p className="info-gone">{gone}</p>
          ) : (
            <>
              <div className="info-hero">
                <span className="mi info-cat" aria-hidden="true">
                  {COUPON_CATEGORY_ICON[cat]}
                </span>
                <div className="info-hero-text">
                  <span className="info-title">{loc(coupon.title)}</span>
                  <span className="info-shop">{vendor.name}</span>
                </div>
                <span className={`info-deal${coupon.dealType === 'free' || coupon.dealType === 'combo' ? ' is-word' : ''}`}>{dealShort(coupon, t)}</span>
              </div>

              <div className={`info-price${need > 0 ? ' is-short' : ''}`}>
                <span className={`info-cost ${mine ? 'cost-paid' : need === 0 ? 'cost-ok' : 'cost-short'}`} aria-label={t('costCoins', { n: coupon.costCoins })} title={t('costCoins', { n: coupon.costCoins })}>
                  <span className="mi" aria-hidden="true">
                    monetization_on
                  </span>
                  {coupon.costCoins}
                </span>
                {mine && <span className="info-have">{t('infoOwned')}</span>}
                {need > 0 && <span className="info-short">{t('infoInsufficient')}</span>}
              </div>
              {coupon.remaining != null && !soldOut && <p className="info-valid">{t('couponLeft', { n: coupon.remaining })}</p>}

              <section className="info-section">
                {/* the address and whether the shop is open; the square button on the left opens the map */}
                <div className="info-where">
                  <a className="info-map" href={mapsSearchUrl(vendor.address ? `${vendor.name}, ${vendor.address}` : `${vendor.lat},${vendor.lng}`)} target="_blank" rel="noopener noreferrer" aria-label={t('shopOpenInMaps')} title={t('shopOpenInMaps')}>
                    <span className="mi" aria-hidden="true">
                      map
                    </span>
                  </a>
                  <div className="info-place-text">
                    <span className="info-address">{vendor.address ?? vendor.name}</span>
                    <span className="info-status">
                      <span className="info-distance">{distance} · </span>
                      <ShopStatus hours={vendor.openHours} short />
                    </span>
                  </div>
                </div>
                {vendor.openHours && (
                  <table className="info-hours">
                    <tbody>
                      {DAYS.map((d) => {
                        const h = vendor.openHours?.[d]
                        return (
                          <tr key={d} className={d === today ? 'today' : undefined}>
                            <td>{t(DAY_KEY[d])}</td>
                            <td>{h ? `${h[0]} - ${h[1]}` : t('shopClosedWord')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
                {status.state === 'unknown' && <p className="info-note">{t('couponUnknownHoursNote')}</p>}
              </section>

              {msg && <p className={`info-msg${msg.ok ? ' ok' : ''}`}>{msg.text}</p>}
              {mine ? (
                <Link to={`/coupons/${mine.uid}`} replace className="info-btn info-btn-primary">
                  {t('infoShowQR')}
                </Link>
              ) : msg?.ok ? (
                <Link to="/coupons" replace className="info-btn info-btn-primary">
                  {t('infoViewMine')}
                </Link>
              ) : soldOut ? (
                <button className="info-btn" disabled>
                  {t('couponSoldOutWord')}
                </button>
              ) : need > 0 ? (
                <Link to="/quests" className="info-btn">
                  {t('infoGoQuests')}
                </Link>
              ) : (
                <button className="info-btn info-btn-primary" disabled={busy} onClick={() => void get()}>
                  {t('infoGet')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
