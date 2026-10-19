import { useState } from 'react'
import { useLang, useT, type Key } from '../i18n'
import { errorKey, vendorApi } from './api'
import { useVendor } from './context'
import type { Offer } from './data'

interface Form {
  id?: string
  titleEn: string
  titleVi: string
  discountPct: string
  costCoins: string
  code: string
  active: boolean
}

const EMPTY: Form = { titleEn: '', titleVi: '', discountPct: '10', costCoins: '50', code: '', active: true }

const toForm = (o: Offer): Form => ({
  id: o.id,
  titleEn: o.title_en,
  titleVi: o.title_vi,
  discountPct: String(o.discount_pct),
  costCoins: String(o.cost_coins),
  code: o.code,
  active: o.active,
})

// The vendor defines the coupons travelers can buy with coins: title (both languages), discount and
// price. The server validates everything and checks the coupon belongs to this business.
export default function Offers() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { offers, rows, reload } = useVendor()
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const stats = (id: string) => {
    const mine = rows.filter((r) => r.coupon_id === id)
    return { claimed: mine.length, redeemed: mine.filter((r) => r.status === 'used').length }
  }

  const save = async (f: Form) => {
    setBusy(true)
    setError('')
    setMsg('')
    const r = await vendorApi('coupon_save', {
      id: f.id,
      titleEn: f.titleEn,
      titleVi: f.titleVi,
      discountPct: Number(f.discountPct),
      costCoins: Number(f.costCoins),
      code: f.code,
      active: f.active,
    })
    setBusy(false)
    if (!r.ok) {
      const key: Key =
        r.error === 'code_taken' ? 'vErrCodeTaken' : r.error === 'too_many_offers' ? 'vErrTooMany' : r.error === 'bad_input' ? 'vErrBadInput' : errorKey(r.error)
      return setError(t(key))
    }
    setMsg(t('vSaved'))
    setForm(null)
    await reload()
  }

  const toggle = (o: Offer) => save({ ...toForm(o), active: !o.active })

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))
  const previewTitle = form ? (lang === 'vi' ? form.titleVi || form.titleEn : form.titleEn || form.titleVi) : ''

  return (
    <>
      <div className="v-head">
        <div>
          <h1>{t('vOffersTitle')}</h1>
          <p className="v-sub">{t('vOffersSub')}</p>
        </div>
        {!form && (
          <button className="v-btn primary" onClick={() => { setForm(EMPTY); setMsg(''); setError('') }}>
            {t('vNewOffer')}
          </button>
        )}
      </div>

      {msg && <p className="v-success">{msg}</p>}

      {form && (
        <section className="v-card">
          <h2>{form.id ? t('vEditOffer') : t('vNewOffer')}</h2>
          <div className="v-two">
            <div className="v-field">
              <label htmlFor="o-en">{t('vTitleEn')}</label>
              <input id="o-en" className="v-input" maxLength={60} value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
            </div>
            <div className="v-field">
              <label htmlFor="o-vi">{t('vTitleVi')}</label>
              <input id="o-vi" className="v-input" maxLength={60} value={form.titleVi} onChange={(e) => set('titleVi', e.target.value)} />
            </div>
            <div className="v-field">
              <label htmlFor="o-pct">{t('vDiscount')}</label>
              <input id="o-pct" className="v-input" inputMode="numeric" value={form.discountPct} onChange={(e) => set('discountPct', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="v-field">
              <label htmlFor="o-cost">{t('vCostCoins')}</label>
              <input id="o-cost" className="v-input" inputMode="numeric" value={form.costCoins} onChange={(e) => set('costCoins', e.target.value.replace(/\D/g, ''))} />
              <span className="v-hint">{t('vCostHint')}</span>
            </div>
          </div>
          <div className="v-field">
            <label htmlFor="o-code">{t('vCodeLabel')}</label>
            <input id="o-code" className="v-input" maxLength={8} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
            <span className="v-hint">{t('vCodeHint')}</span>
          </div>
          <div className="v-field">
            <label>
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> {t('vActive')}
            </label>
          </div>

          <div className="v-found" style={{ marginTop: 0, marginBottom: 12 }}>
            <div className="v-hint">{t('vPreview')}</div>
            <b>
              {t('vPreviewLine', { title: previewTitle || '…', pct: form.discountPct || '0', cost: form.costCoins || '0' })}
            </b>
          </div>

          {error && <p className="v-error">{error}</p>}
          <div className="v-row">
            <button className="v-btn primary" onClick={() => void save(form)} disabled={busy}>
              {busy ? t('vSaving') : t('vSave')}
            </button>
            <button className="v-btn" onClick={() => setForm(null)} disabled={busy}>
              {t('cancel')}
            </button>
          </div>
        </section>
      )}

      <section className="v-card">
        {offers.length === 0 ? (
          <p className="v-empty">{t('vNoOffers')}</p>
        ) : (
          <div className="v-table-scroll">
            <table className="v-table">
              <thead>
                <tr>
                  <th>{t('vColCoupon')}</th>
                  <th className="v-num">{t('vDiscount')}</th>
                  <th className="v-num">{t('vCostCoins')}</th>
                  <th>{t('vCodeLabel')}</th>
                  <th>{t('vColStatus')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const s = stats(o.id)
                  return (
                    <tr key={o.id}>
                      <td>
                        {lang === 'vi' ? o.title_vi : o.title_en}
                        <div className="v-hint">{t('vOfferStats', { c: s.claimed, r: s.redeemed })}</div>
                      </td>
                      <td className="v-num">{o.discount_pct}%</td>
                      <td className="v-num">{o.cost_coins}</td>
                      <td>{o.code}</td>
                      <td>
                        <span className={`v-badge ${o.active ? 'used' : ''}`}>{o.active ? t('vActive') : t('vPaused')}</span>
                      </td>
                      <td className="v-num">
                        <div className="v-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                          <button className="v-btn small" onClick={() => { setForm(toForm(o)); setMsg(''); setError('') }}>
                            {t('vEdit')}
                          </button>
                          <button className="v-btn small" onClick={() => void toggle(o)} disabled={busy}>
                            {o.active ? t('vPause') : t('vResume')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
