import { Link } from 'react-router-dom'
import { coupons } from '../data/coupons'
import { vendors } from '../data/vendors'
import { useAppStore } from '../store/useAppStore'

export default function Coupons() {
  const { coins, redeemCoupon, ownedCoupons } = useAppStore()
  return (
    <div>
      <h2>Kupon</h2>
      <p>Koin: {coins}</p>
      <ul>
        {coupons.map((c) => (
          <li key={c.id}>
            {vendors.find((v) => v.id === c.vendorId)?.name}: {c.title} ({c.discountPct}%) -{' '}
            {c.costCoins} koin{' '}
            <button disabled={coins < c.costCoins} onClick={() => redeemCoupon(c.id)}>
              Tukar
            </button>
          </li>
        ))}
      </ul>
      <h3>Kupon saya</h3>
      <ul>
        {ownedCoupons.map((oc) => {
          const c = coupons.find((x) => x.id === oc.couponId)
          return (
            <li key={oc.uid}>
              {c?.title} [{oc.status}]{' '}
              {oc.status === 'unused' && <Link to={`/coupons/${oc.uid}`}>Tampilkan QR</Link>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
