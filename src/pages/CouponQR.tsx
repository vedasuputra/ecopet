import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ShopStatus from '../components/ShopStatus'
import { COUPON_CATEGORY_ICON, couponCategory } from '../data/couponCategory'
import { dealShort } from '../data/deal'
import { useLang, useLoc, useT } from '../i18n'
import { mapsSearchUrl } from '../lib/geo'
import { isCouponExpired, useAppStore } from '../store/useAppStore'
import { useCatalog } from '../store/useCatalog'
import '../components/ticket.css'
import './couponqr.css'
import { useFadeClose } from '../lib/useFadeClose'

// A coupon you have, shown as a popup over your coupons (they stay behind it, dimmed): a ticket with a tear line and a
// notch on each side. Above the line a top bar ("Coupon Detail" and the X), then the shop, the deal and the rules; below it the
// QR code (big, so it scans easily) with the short code.
export default function CouponQR() {
  const { id } = useParams()
  const t = useT()
  const loc = useLoc()
  const navigate = useNavigate()
  const lang = useLang((s) => s.lang)
  const oc = useAppStore((s) => s.ownedCoupons.find((x) => x.uid === id))
  const coupon = useCatalog((s) => s.coupons.find((c) => c.id === oc?.couponId))
  const vendor = useCatalog((s) => s.vendors.find((v) => v.id === coupon?.vendorId))
  const closeBtn = useRef<HTMLButtonElement>(null)

  const [closing, close] = useFadeClose(() => navigate('/coupons', { replace: true }))
  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const expired = oc ? isCouponExpired(oc) : false
  const used = oc?.status === 'used'
  const cat = couponCategory(vendor?.category.en ?? '', vendor?.kind)
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')

  return (
    <>
      <div className={`popup-backdrop qr-backdrop${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-label={coupon ? loc(coupon.title) : t('couponNotFound')} onClick={close}>
        <div className="qr-stack" onClick={(e) => e.stopPropagation()}>
          {!oc || !coupon ? (
            <div className="qr-ticket">
              <div className="qr-top qr-only">
                <p className="qr-note">{t('couponNotFound')}</p>
              </div>
            </div>
          ) : (
            <div className={`qr-ticket cat-${cat}`}>
              <div className="qr-top">
                <div className="qr-bar">
                  <h3>{t('qrHeading')}</h3>
                  <button ref={closeBtn} className="qr-x" onClick={close} aria-label={t('close')} title={t('close')}>
                    <span className="mi" aria-hidden="true">
                      close
                    </span>
                  </button>
                </div>
                <div className="qr-head">
                  <span className="mi qr-cat" aria-hidden="true">
                    {COUPON_CATEGORY_ICON[cat]}
                  </span>
                  <div className="qr-shop">
                    <span className="qr-shop-name">{vendor?.name ?? '—'}</span>
                    {vendor && (
                      <span className="qr-shop-hours">
                        <ShopStatus hours={vendor.openHours} />
                      </span>
                    )}
                  </div>
                  <span className={`qr-deal${coupon.dealType === 'free' || coupon.dealType === 'combo' ? ' is-word' : ''}`}>{dealShort(coupon, t)}</span>
                </div>
                <div className="qr-title-row">
                  <h2 className="qr-title">{loc(coupon.title)}</h2>
                  {/* the price you paid, faded: it is already yours */}
                  <span className="qr-paid" aria-label={t('costCoins', { n: coupon.costCoins })} title={t('costCoins', { n: coupon.costCoins })}>
                    <span className="mi" aria-hidden="true">
                      monetization_on
                    </span>
                    {coupon.costCoins}
                  </span>
                </div>
                <ul className="qr-rules">
                  {oc.expiresAt && !used && <li>{expired ? t('couponExpiredMsg') : t('qrValidUntil', { d: date(oc.expiresAt) })}</li>}
                  {vendor && <li>{vendor.address ? t('qrAtShopAddress', { shop: vendor.name, address: vendor.address }) : t('qrAtShop', { shop: vendor.name })}</li>}
                  <li>{t('qrShowStaff')}</li>
                </ul>
              </div>

              <div className="qr-bottom">
                {used || expired ? (
                  <p className="qr-state">{used ? t('qrUsedMsg') : t('couponExpired')}</p>
                ) : (
                  <>
                    <QRCodeSVG value={oc.uid} size={200} />
                    <p className="qr-code">
                      {t('codeLabel')}: <b>{`${coupon.code}-${oc.uid.slice(-4)}`}</b>
                    </p>
                  </>
                )}
                <div className="qr-icons">
                  {vendor ? (
                    <a href={mapsSearchUrl(vendor.address ? `${vendor.name}, ${vendor.address}` : `${vendor.lat},${vendor.lng}`)} target="_blank" rel="noopener noreferrer" aria-label={t('shopOpenInMaps')} title={t('shopOpenInMaps')}>
                      <span className="mi" aria-hidden="true">
                        map
                      </span>
                    </a>
                  ) : (
                    <span />
                  )}
                  <Link to={`/offers/${coupon.id}`} aria-label={t('qrDetails')} title={t('qrDetails')}>
                    <span className="mi" aria-hidden="true">
                      info
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
