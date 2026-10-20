import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useLoc, useT } from '../i18n'
import { buyCoupon } from '../store/economy'
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
            : r.error === 'unreachable'
            ? t('unreachable')
            : t('couponGetFail'),
    )
  }

  return (
    <div>
      <h2>{t('coupons')}</h2>
      <p>{t('coinsLine', { n: coins })}</p>
      {msg && <p>{msg}</p>}
      <ul>
        {coupons
          .filter((c) => c.active !== false)
          .map((c) => {
            const soldOut = c.remaining === 0
            return (
              <li key={c.id}>
                {vendors.find((v) => v.id === c.vendorId)?.name}: {loc(c.title)} ({c.discountPct}%) -{' '}
                {t('costCoins', { n: c.costCoins })}{' '}
                <small>
                  ({t('couponValid', { n: c.validDays ?? 30 })}
                  {c.remaining != null && !soldOut && `, ${t('couponLeft', { n: c.remaining })}`})
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
            </li>
          )
        })}
      </ul>
    </div>
  )
}
