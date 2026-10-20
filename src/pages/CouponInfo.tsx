import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ShopStatus, { DAY_KEY } from '../components/ShopStatus'
import { useLoc, useT } from '../i18n'
import { haversine } from '../lib/geo'
import { DAYS, openStatus, todayKey } from '../lib/openHours'
import { buyCoupon } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import { useLocation } from '../store/useLocation'

// Everything about one coupon before you get it: what the shop is, where it is, when it is open.
// Reachable for any coupon, claimed or not.
export default function CouponInfo() {
  const { id } = useParams()
  const t = useT()
  const loc = useLoc()
  const coins = useAppStore((s) => s.coins)
  const coupon = useCatalog((s) => s.coupons.find((c) => c.id === id))
  const vendor = useCatalog((s) => s.vendors.find((v) => v.id === coupon?.vendorId))
  const { lat, lng } = useLocation()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (!coupon) {
    return (
      <p>
        {t('couponNotFound')} <Link to="/coupons">{t('back')}</Link>
      </p>
    )
  }
  // vendors in the catalog are the paid-up ones: no vendor = not offering coupons right now
  if (!vendor) {
    return (
      <p>
        {t('couponShopGone')} <Link to="/coupons">{t('back')}</Link>
      </p>
    )
  }

  const status = openStatus(vendor.openHours)
  const soldOut = coupon.remaining === 0
  const km = haversine(lat, lng, vendor.lat, vendor.lng) / 1000

  const get = async () => {
    setBusy(true)
    setMsg('')
    const r = await buyCoupon(coupon.id)
    setBusy(false)
    setMsg(
      r.ok
        ? t('couponGot')
        : r.error === 'insufficient_coins'
          ? t('notEnoughCoins')
          : r.error === 'sold_out'
            ? t('couponSoldOutMsg')
            : r.error === 'daily_coupon_limit'
              ? t('couponDailyLimitMsg')
              : r.error === 'unreachable'
                ? t('unreachable')
                : t('couponGetFail'),
    )
  }

  return (
    <div>
      <p>
        <Link to="/coupons">{t('back')}</Link>
      </p>
      <h2>{loc(coupon.title)}</h2>
      <p>
        {t('couponDiscountLine', { pct: coupon.discountPct })} · {t('couponCost', { n: coupon.costCoins })}
      </p>
      <p>
        <small>
          {t('couponValid', { n: coupon.validDays ?? 30 })}
          {coupon.remaining != null && !soldOut && `, ${t('couponLeft', { n: coupon.remaining })}`}
        </small>
      </p>

      <h3>{t('couponAt')}</h3>
      <p>
        <b>{vendor.name}</b> ({loc(vendor.category)})
      </p>
      <p>
        {t('shopAddress')}: {vendor.address ?? '—'}
        <br />
        <small>{t('shopFarAway', { n: km < 10 ? km.toFixed(1) : Math.round(km) })}</small>{' '}
        <a href={`https://www.google.com/maps/search/?api=1&query=${vendor.lat},${vendor.lng}`} target="_blank" rel="noopener noreferrer">
          {t('shopOpenInMaps')}
        </a>
      </p>

      <h3>{t('shopHours')}</h3>
      <p>
        <ShopStatus hours={vendor.openHours} />
      </p>
      {vendor.openHours && (
        <table>
          <tbody>
            {DAYS.map((d) => {
              const h = vendor.openHours?.[d]
              return (
                <tr key={d} style={d === todayKey() ? { fontWeight: 'bold' } : undefined}>
                  <td>{t(DAY_KEY[d])}</td>
                  <td>{h ? `${h[0]} - ${h[1]}` : t('shopClosedAlways')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {status.state === 'closed' && <p>{t('couponClosedNote', { n: coupon.validDays ?? 30 })}</p>}
      {status.state === 'unknown' && <p>{t('couponUnknownHoursNote')}</p>}

      {msg && <p>{msg}</p>}
      {soldOut ? (
        <b>{t('couponSoldOut')}</b>
      ) : (
        <button disabled={busy || coins < coupon.costCoins} onClick={() => void get()}>
          {t('redeem')}
        </button>
      )}
      {coins < coupon.costCoins && <p>{t('notEnoughCoins')}</p>}
    </div>
  )
}
