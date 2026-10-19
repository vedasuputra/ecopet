import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLoc, useT } from '../i18n'
import { buyCoupon } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'

export default function Coupons() {
  const t = useT()
  const loc = useLoc()
  const { coins, ownedCoupons } = useAppStore()
  const { coupons, vendors } = useCatalog()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const redeem = async (couponId: string) => {
    setBusy(true)
    setMsg('')
    const r = await buyCoupon(couponId)
    setBusy(false)
    if (r.ok) return setMsg(t('couponGot'))
    setMsg(r.error === 'insufficient_coins' ? t('notEnoughCoins') : r.error === 'unreachable' ? t('unreachable') : t('couponGetFail'))
  }

  return (
    <div>
      <h2>{t('coupons')}</h2>
      <p>{t('coinsLine', { n: coins })}</p>
      {msg && <p>{msg}</p>}
      <ul>
        {coupons
          .filter((c) => c.active !== false)
          .map((c) => (
            <li key={c.id}>
              {vendors.find((v) => v.id === c.vendorId)?.name}: {loc(c.title)} ({c.discountPct}%) -{' '}
              {t('costCoins', { n: c.costCoins })}{' '}
              <button disabled={busy || coins < c.costCoins} onClick={() => redeem(c.id)}>
                {t('redeem')}
              </button>
            </li>
          ))}
      </ul>
      <h3>{t('myCoupons')}</h3>
      <ul>
        {ownedCoupons.map((oc) => {
          const c = coupons.find((x) => x.id === oc.couponId)
          return (
            <li key={oc.uid}>
              {c ? loc(c.title) : oc.couponId} [{oc.status === 'used' ? t('statusUsed') : t('statusUnused')}]{' '}
              {oc.status === 'unused' && <Link to={`/coupons/${oc.uid}`}>{t('showQR')}</Link>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
