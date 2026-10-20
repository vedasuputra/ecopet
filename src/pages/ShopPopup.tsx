import { useEffect, useRef } from 'react'
import { useLocation as useRoute, useNavigate, useParams } from 'react-router-dom'
import CouponTicket from '../components/CouponTicket'
import ShopStatus, { DAY_KEY } from '../components/ShopStatus'
import { COUPON_CATEGORY_ICON, couponCategory } from '../data/couponCategory'
import { dealShort } from '../data/deal'
import { useLoc, useT } from '../i18n'
import { formatDistance, haversine, mapsSearchUrl } from '../lib/geo'
import { DAYS, openStatus, todayKey } from '../lib/openHours'
import { useFadeClose } from '../lib/useFadeClose'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'
import '../components/ticket.css'
import './couponinfo.css'
import './shoppopup.css'

interface FromState {
  from?: string
  fromState?: unknown
}

// A partner shop as a popup (opened from the trip plan, from a coupon, ...): where it is, when it is open, and every coupon it
// offers (each opens that coupon). Closing it goes back to where it was opened from.
export default function ShopPopup() {
  const { id } = useParams()
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const route = useRoute()
  const routeState = route.state as FromState | null
  const coins = useAppStore((s) => s.coins)
  const vendor = useCatalog((s) => s.vendors.find((v) => v.id === id))
  const coupons = useCatalog((s) => s.coupons)
  const { lat, lng } = useLocation()
  const closeBtn = useRef<HTMLButtonElement>(null)

  const back = routeState?.from === 'home' ? '/home' : routeState?.from?.startsWith('/') ? routeState.from : '/coupons'
  const [closing, close] = useFadeClose(() => navigate(back, { replace: true, state: routeState?.fromState }))
  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [close])

  const mine = vendor ? coupons.filter((c) => c.vendorId === vendor.id && c.active !== false) : []
  const cat = couponCategory(vendor?.category.en ?? '', vendor?.kind)
  const today = todayKey()
  const status = openStatus(vendor?.openHours)
  // a coupon opened from here comes back here when it is closed
  const toOffer = { from: route.pathname, fromState: routeState }

  return (
    <div className={`popup-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={t('shopTitle')} onClick={close}>
      <div className={`popup-card info-popup cat-${cat}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup-head">
          <div className="popup-titles">
            <h3>{t('shopTitle')}</h3>
          </div>
          <button ref={closeBtn} className="popup-close" onClick={close} aria-label={t('close')} title={t('close')}>
            <span className="mi" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {!vendor ? (
          <p className="info-gone">{t('couponShopGone')}</p>
        ) : (
          <>
            <div className="info-hero">
              <span className="mi info-cat" aria-hidden="true">
                {COUPON_CATEGORY_ICON[cat]}
              </span>
              <div className="info-hero-text">
                <span className="info-title">{vendor.name}</span>
                <span className="info-shop">{loc(vendor.category)}</span>
              </div>
            </div>

            <h4 className="shop-sub">{t('shopCoupons')}</h4>
            {mine.length === 0 ? (
              <p className="info-note">{t('shopNoCoupons')}</p>
            ) : (
              <ul className="shop-coupons">
                {mine.map((c) => (
                  <CouponTicket
                    key={c.id}
                    to={`/offers/${c.id}`}
                    linkState={toOffer}
                    title={loc(c.title)}
                    shop={vendor.name}
                    category={cat}
                    deal={dealShort(c, t)}
                    dealIsWord={c.dealType === 'free' || c.dealType === 'combo'}
                    cost={c.costCoins}
                    coins={coins}
                    state={c.remaining === 0 ? 'soldout' : undefined}
                  />
                ))}
              </ul>
            )}
            <section className="info-section">
              {/* the icon AND the words open the map */}
              <a
                className="info-where info-where-link"
                href={mapsSearchUrl(vendor.address ? `${vendor.name}, ${vendor.address}` : `${vendor.lat},${vendor.lng}`)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('shopOpenInMaps')}
                title={t('shopOpenInMaps')}
              >
                <span className="info-map">
                  <span className="mi" aria-hidden="true">
                    map
                  </span>
                </span>
                <span className="info-place-text">
                  <span className="info-address">{vendor.address ?? vendor.name}</span>
                  <span className="info-status">
                    <span className="info-distance">{formatDistance(haversine(lat, lng, vendor.lat, vendor.lng))} · </span>
                    <ShopStatus hours={vendor.openHours} short />
                  </span>
                </span>
              </a>
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

          </>
        )}
      </div>
    </div>
  )
}
