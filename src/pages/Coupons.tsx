import BannerAd from '../components/BannerAd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import ShopStatus from '../components/ShopStatus'
import { useLang, useLoc, useT } from '../i18n'
import { buyCoupon, refundCoupon } from '../store/economy'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'

export default function Coupons() {
  const t = useT()
  const loc = useLoc()
  const lang = useLang((s) => s.lang)
  const { coins, ownedCoupons } = useAppStore()
  const { coupons, vendors } = useCatalog()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')

  const redeem = async (couponId: string) => {
    setBusy(true)
    setMsg('')
    const r = await buyCoupon(couponId)
    setBusy(false)
    if (r.ok) return setMsg(t('couponGot'))
    setMsg(
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
    )
  }

  const refund = async (uid: string) => {
    setBusy(true)
    setMsg('')
    const r = await refundCoupon(uid)
    setBusy(false)
    setMsg(r.ok ? t('couponRefunded') : r.error === 'shop_active' ? t('couponRefundShopBack') : t('couponRefundFail'))
  }

  return (
    <div>
      <h2>{t('coupons')}</h2>
      <p>{t('coinsLine', { n: coins })}</p>
      {msg && <p>{msg}</p>}
      <ul>
        {coupons
          .filter((c) => c.active !== false && vendors.some((v) => v.id === c.vendorId))
          .map((c) => {
            const soldOut = c.remaining === 0
            return (
              <li key={c.id}>
                <Link to={`/offers/${c.id}`}>
                  {vendors.find((v) => v.id === c.vendorId)?.name}: {loc(c.title)}
                </Link>{' '}
                ({c.discountPct}%) -{' '}
                {t('costCoins', { n: c.costCoins })}{' '}
                <small>
                  ({t('couponValid', { n: c.validDays ?? 30 })}
                  {c.remaining != null && !soldOut && `, ${t('couponLeft', { n: c.remaining })}`})
                </small>{' '}
                <br />
                <small>
                  <ShopStatus hours={vendors.find((v) => v.id === c.vendorId)?.openHours} />
                </small>{' '}
                {soldOut ? (
                  <b>{t('couponSoldOut')}</b>
                ) : (
                  <button disabled={busy || coins < c.costCoins} onClick={() => redeem(c.id)}>
                    {t('redeem')}
                  </button>
                )}
              </li>
            )
          })}
      </ul>
      <h3>{t('myCoupons')}</h3>
      <ul>
        {ownedCoupons.map((oc) => {
          const c = coupons.find((x) => x.id === oc.couponId)
          const expired = isCouponExpired(oc)
          return (
            <li key={oc.uid} style={expired ? { opacity: 0.55 } : undefined}>
              {c ? loc(c.title) : oc.couponId} [
              {oc.status === 'used' ? t('statusUsed') : expired ? t('couponExpired') : t('statusUnused')}]{' '}
              {oc.status === 'unused' && oc.expiresAt && !expired && <small>({t('couponExpires', { d: date(oc.expiresAt) })}) </small>}
              {oc.status === 'unused' && !expired && <Link to={`/coupons/${oc.uid}`}>{t('showQR')}</Link>}
              {oc.status === 'unused' && c && !vendors.some((v) => v.id === c.vendorId) && (
                <div>
                  <small>{t('couponShopPaused')}</small>{' '}
                  {oc.source !== 'welcome' && (
                    <button disabled={busy} onClick={() => void refund(oc.uid)}>
                      {t('couponRefundBtn')}
                    </button>
                  )}{' '}
                  <small>{t('couponOrWait')}</small>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <BannerAd />
    </div>
  )
}
