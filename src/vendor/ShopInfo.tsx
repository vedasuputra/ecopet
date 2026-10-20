import { useState } from 'react'
import { DAY_KEY } from '../components/ShopStatus'
import { useT, type Key } from '../i18n'
import { DAYS, type Day, type OpenHours } from '../lib/openHours'
import { vendorApi } from './api'
import { useVendor } from './context'

type Row = { open: boolean; from: string; to: string }
type Week = Record<Day, Row>

const DEFAULT_ROW: Row = { open: true, from: '08:00', to: '17:00' }

const toWeek = (h: OpenHours | null): Week =>
  Object.fromEntries(
    DAYS.map((d) => {
      const x = h?.[d]
      return [d, x ? { open: true, from: x[0], to: x[1] } : h ? { ...DEFAULT_ROW, open: false } : DEFAULT_ROW]
    }),
  ) as Week

// The shop's address and weekly opening hours. Travelers see them on the coupon page.
export default function ShopInfo() {
  const t = useT()
  const { vendor, reload } = useVendor()
  const [address, setAddress] = useState(vendor.address ?? '')
  const [week, setWeek] = useState<Week>(toWeek(vendor.open_hours))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const set = (d: Day, patch: Partial<Row>) => setWeek((w) => ({ ...w, [d]: { ...w[d], ...patch } }))
  const copyMonday = () => setWeek((w) => Object.fromEntries(DAYS.map((d) => [d, { ...w.mon }])) as Week)

  const save = async () => {
    setError('')
    setMsg('')
    if (DAYS.some((d) => week[d].open && week[d].from >= week[d].to)) return setError(t('vErrHours'))
    const openHours: OpenHours = {}
    for (const d of DAYS) if (week[d].open) openHours[d] = [week[d].from, week[d].to]
    setBusy(true)
    const r = await vendorApi('profile_save', { address, openHours })
    setBusy(false)
    if (!r.ok) return setError(t(r.error === 'bad_input' ? 'vErrHours' : ('vErrGeneric' as Key)))
    setMsg(t('vShopSaved'))
    await reload()
  }

  return (
    <>
      <div className="v-head">
        <div>
          <h1>{t('vShopInfoTitle')}</h1>
          <p className="v-sub">{t('vShopInfoSub')}</p>
        </div>
      </div>

      {!vendor.open_hours && <p className="v-hint" style={{ marginBottom: 12 }}>{t('vHoursMissing')}</p>}

      <section className="v-card">
        <div className="v-field">
          <label htmlFor="s-addr">{t('vAddress')}</label>
          <input id="s-addr" className="v-input" maxLength={120} value={address} onChange={(e) => setAddress(e.target.value)} />
          <span className="v-hint">{t('vAddressHint')}</span>
        </div>
      </section>

      <section className="v-card">
        <h2>{t('vHoursTitle')}</h2>
        <table className="v-ledger">
          <tbody>
            {DAYS.map((d) => (
              <tr key={d}>
                <td>{t(DAY_KEY[d])}</td>
                <td>
                  <label>
                    <input type="checkbox" checked={week[d].open} onChange={(e) => set(d, { open: e.target.checked })} /> {week[d].open ? t('vOpenThisDay') : t('vClosedDay')}
                  </label>
                </td>
                <td>
                  {week[d].open && (
                    <span className="v-row" style={{ flexWrap: 'nowrap' }}>
                      <input className="v-input" type="time" aria-label={`${t(DAY_KEY[d])} open`} value={week[d].from} onChange={(e) => set(d, { from: e.target.value })} />
                      <input className="v-input" type="time" aria-label={`${t(DAY_KEY[d])} close`} value={week[d].to} onChange={(e) => set(d, { to: e.target.value })} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="v-row" style={{ marginTop: 12 }}>
          <button className="v-btn" onClick={copyMonday}>
            {t('vCopyToAll')}
          </button>
        </div>
      </section>

      {msg && <p className="v-success">{msg}</p>}
      {error && <p className="v-error">{error}</p>}
      <button className="v-btn primary" onClick={() => void save()} disabled={busy}>
        {busy ? t('vSaving') : t('vSaveShop')}
      </button>
    </>
  )
}
