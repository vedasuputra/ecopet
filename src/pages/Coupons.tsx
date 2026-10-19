import { Link } from 'react-router-dom'
import { coupons } from '../data/coupons'
import { vendors } from '../data/vendors'
import { useLoc, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

export default function Coupons() {
  const t = useT()
  const loc = useLoc()
  const { coins, redeemCoupon, ownedCoupons } = useAppStore()
  return (
    <div>
      <h2>{t('coupons')}</h2>
      <p>{t('coinsLine', { n: coins })}</p>
      <ul>
        {coupons.map((c) => (
          <li key={c.id}>
            {vendors.find((v) => v.id === c.vendorId)?.name}: {loc(c.title)} ({c.discountPct}%) -{' '}

            {t('costCoins', { n: c.costCoins })}{' '}
            <button disabled={coins < c.costCoins} onClick={() => redeemCoupon(c.id)}>
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
              {c ? loc(c.title) : ''} [{oc.status === 'used' ? t('statusUsed') : t('statusUnused')}]{' '}
              {oc.status === 'unused' && <Link to={`/coupons/${oc.uid}`}>{t('showQR')}</Link>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
