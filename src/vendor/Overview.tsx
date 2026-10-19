import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { useVendor } from './context'
import DailyChart from './DailyChart'
import { computeStats, couponTitle, dailySeries } from './data'
import { dateTime, pct, travelerTag, vnd } from './format'

export default function Overview() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { vendor, rows } = useVendor()
  const s = computeStats(rows)
  const recent = rows.slice(0, 6)

  const tiles: { label: string; value: string; note?: string }[] = [
    { label: t('vStatClaimed'), value: String(s.claimed) },
    { label: t('vStatRedeemed'), value: String(s.redeemed) },
    { label: t('vStatRate'), value: pct(s.rate) },
    { label: t('vStatTravelers'), value: String(s.travelers) },
    { label: t('vStatAvg'), value: s.redeemed ? vnd(s.avgBill, lang) : '—' },
    { label: t('vStatDiscount'), value: vnd(s.discountGiven, lang) },
    { label: t('vStatCommission'), value: vnd(s.commission, lang) },
    { label: t('vStatNet'), value: vnd(s.net, lang) },
  ]

  return (
    <>
      <div className="v-head">
        <div>
          <h1>{t('vHello', { name: vendor.name })}</h1>
          <p className="v-sub">{t('vOverviewSub')}</p>
        </div>
        <Link className="v-btn primary" to="/vendor/scan" style={{ textDecoration: 'none' }}>
          {t('vScan')}
        </Link>
      </div>

      <section className="v-hero">
        <div className="v-label" style={{ color: 'var(--ink-2)' }}>
          {t('vHero')}
        </div>
        <div className="v-value">{vnd(s.sales, lang)}</div>
        <div className="v-hint">{t('vHeroNote')}</div>
      </section>

      <div className="v-grid-tiles">
        {tiles.map((x) => (
          <div className="v-tile" key={x.label}>
            <div className="v-label">{x.label}</div>
            <div className="v-value">{x.value}</div>
          </div>
        ))}
      </div>

      <section className="v-card">
        <h2>{t('vChartTitle')}</h2>
        <DailyChart data={dailySeries(rows, 14)} />
      </section>

      <div className="v-two">
        <section className="v-card">
          <div className="v-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>{t('vRecent')}</h2>
            <Link to="/vendor/redemptions">{t('vViewAll')}</Link>
          </div>
          {recent.length === 0 ? (
            <p className="v-empty">{t('vNoActivity')}</p>
          ) : (
            <div className="v-table-scroll">
              <table className="v-table">
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.uid}>
                      <td>
                        {couponTitle(r.coupon_id, lang)}
                        <div className="v-hint">
                          {t('vTravelerTag', { tag: travelerTag(r.uid) })} · {dateTime(r.redeemed_at ?? r.issued_at, lang)}
                        </div>
                      </td>
                      <td className="v-num">
                        <span className={`v-badge ${r.status === 'used' ? 'used' : ''}`}>
                          {r.status === 'used' ? t('vStatusUsed') : t('vStatusUnused')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="v-card">
          <h2>{t('vHow')}</h2>
          <ul className="v-list">
            <li>{t('vHow1')}</li>
            <li>{t('vHow2')}</li>
            <li>{t('vHow3')}</li>
            <li>{t('vHow4')}</li>
          </ul>
        </section>
      </div>
    </>
  )
}
