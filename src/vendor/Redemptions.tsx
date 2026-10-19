import { useMemo, useState } from 'react'
import { useLang, useT } from '../i18n'
import { useVendor } from './context'
import { couponTitle, type IssuedRow } from './data'
import { dateTime, num, travelerTag, vnd } from './format'

type Filter = 'all' | 'used' | 'unused'

export default function Redemptions() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { rows } = useVendor()
  const [filter, setFilter] = useState<Filter>('all')

  const shown = useMemo(() => (filter === 'all' ? rows : rows.filter((r) => r.status === filter)), [rows, filter])
  const used = shown.filter((r) => r.status === 'used')
  const totalAmount = used.reduce((a, r) => a + (r.amount_vnd ?? 0), 0)
  const totalCommission = used.reduce((a, r) => a + (r.commission_vnd ?? 0), 0)

  const exportCsv = () => {
    const esc = (v: string | number | null) => `"${String(v ?? '').replaceAll('"', '""')}"`
    const head = ['coupon', 'traveler', 'source', 'status', 'claimed_at', 'redeemed_at', 'amount_vnd', 'commission_vnd']
    const lines = shown.map((r: IssuedRow) =>
      [couponTitle(r.coupon_id, 'en'), travelerTag(r.uid), r.source, r.status, r.issued_at, r.redeemed_at, r.amount_vnd, r.commission_vnd]
        .map(esc)
        .join(','),
    )
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ecopet-redemptions.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('vFilterAll') },
    { id: 'used', label: t('vStatusUsed') },
    { id: 'unused', label: t('vStatusUnused') },
  ]

  return (
    <>
      <div className="v-head">
        <h1>{t('vRedemptions')}</h1>
        <div className="v-row">
          <div className="v-tabs" style={{ margin: 0 }}>
            {filters.map((f) => (
              <button key={f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <button className="v-btn" onClick={exportCsv} disabled={!shown.length}>
            {t('vExport')}
          </button>
        </div>
      </div>

      <section className="v-card">
        {shown.length === 0 ? (
          <p className="v-empty">{t('vEmptyTable')}</p>
        ) : (
          <div className="v-table-scroll">
            <table className="v-table">
              <thead>
                <tr>
                  <th>{t('vColCoupon')}</th>
                  <th>{t('vColTraveler')}</th>
                  <th className="hide-md">{t('vColSource')}</th>
                  <th>{t('vColStatus')}</th>
                  <th className="hide-sm">{t('vColClaimedAt')}</th>
                  <th>{t('vColRedeemedAt')}</th>
                  <th className="v-num">{t('vColAmount')}</th>
                  <th className="v-num">{t('vColCommission')}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.uid}>
                    <td>
                      {couponTitle(r.coupon_id, lang)} <span className="v-hint">({r.discount_pct}%)</span>
                    </td>
                    <td>#{travelerTag(r.uid)}</td>
                    <td className="hide-md">{r.source === 'welcome' ? t('vSourceWelcome') : t('vSourceCoins')}</td>
                    <td>
                      <span className={`v-badge ${r.status === 'used' ? 'used' : ''}`}>
                        {r.status === 'used' ? t('vStatusUsed') : t('vStatusUnused')}
                      </span>
                    </td>
                    <td className="hide-sm">{dateTime(r.issued_at, lang)}</td>
                    <td>{r.redeemed_at ? dateTime(r.redeemed_at, lang) : '—'}</td>
                    <td className="v-num">{r.amount_vnd != null ? num(r.amount_vnd, lang) : '—'}</td>
                    <td className="v-num">{r.commission_vnd != null ? num(r.commission_vnd, lang) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>{t('vTotals')}</td>
                  <td className="hide-md" />
                  <td />
                  <td className="hide-sm" />
                  <td />
                  <td className="v-num">{vnd(totalAmount, lang)}</td>
                  <td className="v-num">{vnd(totalCommission, lang)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
