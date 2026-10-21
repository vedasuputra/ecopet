import { dealLong } from '../data/deal'
import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { errorKey, vendorApi } from './api'
import { useVendor } from './context'
import { couponTitle } from './data'

const READER_ID = 'v-qr-reader'
const DEFAULT_BILL = 150000 // average basket from the business plan

interface Found {
  uid: string
  couponId: string
  discountPct: number
  dealType?: string
  dealValue?: number | null
}

// Vendor-side scanner. The traveler's app shows the QR (payload = coupon uid) and a short code;
// the vendor scans the QR with this page's camera, or types the short code. The server checks the
// coupon belongs to THIS business and is still unused, then records the amount and 5% commission.
export default function Scan() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { reload, offers } = useVendor()
  const scanner = useRef<Html5Qrcode | null>(null)
  const handling = useRef(false)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [amount, setAmount] = useState(String(DEFAULT_BILL))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ amount: number; commission: number } | null>(null)

  const stopCamera = async () => {
    const s = scanner.current
    scanner.current = null
    try {
      if (s?.isScanning) await s.stop()
      s?.clear()
    } catch {
      /* already stopped */
    }
    setScanning(false)
  }

  useEffect(
    () => () => {
      void stopCamera()
    },
    [],
  )

  const lookup = async (code: string) => {
    setError('')
    setDone(null)
    setBusy(true)
    const r = await vendorApi('lookup', { code })
    setBusy(false)
    if (!r.ok) return setError(t(errorKey(r.error)))
    setFound(r.coupon as Found)
    setAmount(String(DEFAULT_BILL))
  }

  const onScanned = async (text: string) => {
    if (handling.current) return
    handling.current = true
    await stopCamera()
    await lookup(text)
    handling.current = false
  }

  const startCamera = async () => {
    setError('')
    setDone(null)
    setFound(null)
    setScanning(true)
    // let the box show first (the scanner sizes the video to it)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    try {
      const qr = new Html5Qrcode(READER_ID)
      scanner.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => void onScanned(text),
        () => {},
      )
    } catch (e) {
      scanner.current = null
      setScanning(false)
      setError(/permission|denied|notallowed/i.test(String(e)) ? t('vCameraDenied') : t('vCameraError'))
    }
  }

  const confirm = async () => {
    if (!found) return
    const amountVnd = Number(amount.replace(/[^\d]/g, ''))
    if (!amountVnd || amountVnd < 1000) return setError(t('vErrAmount'))
    setBusy(true)
    setError('')
    const r = await vendorApi('redeem', { code: found.uid, amountVnd })
    setBusy(false)
    if (!r.ok) return setError(t(errorKey(r.error)))
    setDone({ amount: Number(r.amountVnd), commission: Number(r.commissionVnd) })
    setFound(null)
    void reload()
  }

  const reset = () => {
    setFound(null)
    setDone(null)
    setError('')
    setManual('')
  }

  return (
    <>
      <div className="v-head">
        <div>
          <h1>{t('vScanTitle')}</h1>
          <p className="v-sub">{t('vScanSub')}</p>
        </div>
      </div>

      <section className="v-card">
        <div id={READER_ID} className={`v-reader${scanning ? ' on' : ''}`} />
        {scanning && <p className="v-hint" style={{ textAlign: 'center', marginBottom: 12 }}>{t('vReady')}</p>}
        {scanning ? (
          <button className="v-btn v-wide" onClick={() => void stopCamera()}>
            {t('vStopCamera')}
          </button>
        ) : (
          <button className="v-btn primary v-wide" onClick={() => void startCamera()} disabled={busy}>
            {t('vStartCamera')}
          </button>
        )}

        <div className="v-field" style={{ marginTop: 18 }}>
          <label htmlFor="v-code">{t('vOrManual')}</label>
          <div className="v-row" style={{ flexWrap: 'nowrap' }}>
            <input
              id="v-code"
              className="v-input"
              placeholder={t('vCodePlaceholder')}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && manual.trim() && void lookup(manual)}
            />
            <button className="v-btn" onClick={() => void lookup(manual)} disabled={busy || !manual.trim()}>
              {t('vLookup')}
            </button>
          </div>
        </div>

        {error && <p className="v-error">{error}</p>}

        {found && (
          <div className="v-found">
            <h3>{t('vCouponFound')}</h3>
            <p>
              {t('vDealLine', {
                title: couponTitle(offers, found.couponId, lang),
                deal: dealLong(found, t),
              })}
            </p>
            <p className="v-hint">{offers.find((o) => o.id === found.couponId)?.code}</p>
            <div className="v-field" style={{ marginTop: 12 }}>
              <label htmlFor="v-amount">{t('vAmountLabel')}</label>
              <input
                id="v-amount"
                className="v-input"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="v-hint">{t('vAmountHint')}</span>
            </div>
            <div className="v-row">
              <button className="v-btn primary" onClick={() => void confirm()} disabled={busy}>
                {busy ? t('vRedeeming') : t('vConfirmRedeem')}
              </button>
              <button className="v-btn" onClick={reset} disabled={busy}>
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {done && (
          <div>
            <p className="v-success">
              {t('vRedeemedOk', {
                c: done.commission.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB'),
                a: done.amount.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB'),
              })}
            </p>
            <button className="v-btn primary" onClick={reset}>
              {t('vScanAnother')}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
