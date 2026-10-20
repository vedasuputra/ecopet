import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import { useLang, useLoc, useT } from '../i18n'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'

export default function CouponQR() {
  const { id } = useParams()
  const t = useT()
  const loc = useLoc()
  const lang = useLang((s) => s.lang)
  const oc = useAppStore((s) => s.ownedCoupons.find((x) => x.uid === id))
  const coupon = useCatalog((s) => s.coupons.find((c) => c.id === oc?.couponId))
  if (!oc || !coupon) {
    return (
      <p>
        {t('couponNotFound')} <Link to="/coupons">{t('back')}</Link>
      </p>
    )
  }

  const expired = isCouponExpired(oc)
  // Short code fallback: vendor can confirm via SMS/chat without the scanner.
  const shortCode = `${coupon.code}-${oc.uid.slice(-4)}`
  return (
    <div>
      <h2>{loc(coupon.title)}</h2>
      {expired ? (
        <p>{t('couponExpiredMsg')}</p>
      ) : (
        <>
          <QRCodeSVG value={oc.uid} />
          <p>
            {t('codeLabel')}: <b>{shortCode}</b>
          </p>
        </>
      )}
      <p>
        {t('statusLabel')}: {oc.status === 'used' ? t('statusUsed') : expired ? t('couponExpired') : t('statusUnused')}
      </p>
      {oc.expiresAt && oc.status === 'unused' && !expired && (
        <p>{t('couponExpires', { d: new Date(oc.expiresAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB') })}</p>
      )}
    </div>
  )
}
