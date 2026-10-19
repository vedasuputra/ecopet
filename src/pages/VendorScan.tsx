import { coupons } from '../data/coupons'
import { vendors } from '../data/vendors'
import { useAppStore } from '../store/useAppStore'

export default function VendorScan() {
  const { ownedCoupons, useCoupon } = useAppStore()
  const unused = ownedCoupons.filter((o) => o.status === 'unused')
  return (
    <div>
      <h2>Vendor scan (simulasi)</h2>
      {unused.length === 0 && <p>Tidak ada kupon aktif.</p>}
      <ul>
        {unused.map((oc) => {
          const c = coupons.find((x) => x.id === oc.couponId)
          return (
            <li key={oc.uid}>
              {vendors.find((v) => v.id === c?.vendorId)?.name}: {c?.title}{' '}
              <button onClick={() => useCoupon(oc.uid)}>Simulate scan</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
