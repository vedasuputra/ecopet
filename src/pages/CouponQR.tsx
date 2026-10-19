import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import { coupons } from '../data/coupons'
import { useLoc, useT } from '../i18n'
import { useAppStore } from '../store/useAppStore'

export default function CouponQR() {
  const { id } = useParams()
  const t = useT()
  const loc = useLoc()
  const oc = useAppStore((s) => s.ownedCoupons.find((x) => x.uid === id))
  const coupon = coupons.find((c) => c.id === oc?.couponId)
  if (!oc || !coupon) {
    return (
      <p>
        {t('couponNotFound')} <Link to="/coupons">{t('back')}</Link>
      </p>
    )
  }

  // Short code fallback: vendor can confirm via SMS/chat without the scanner.
  const shortCode = `${coupon.code}-${oc.uid.slice(-4)}`
  return (
    <div>
      <h2>{loc(coupon.title)}</h2>
      <QRCodeSVG value={oc.uid} />
      <p>
        {t('codeLabel')}: <b>{shortCode}</b>
      </p>
      <p>
        {t('statusLabel')}: {oc.status === 'used' ? t('statusUsed') : t('statusUnused')}
      </p>
    </div>
  )
}
