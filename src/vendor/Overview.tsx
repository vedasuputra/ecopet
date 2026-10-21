import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { useVendor } from './context'
import DailyChart from './DailyChart'
import { computeStats, couponTitle, dailySeries, rowExpired, statsByOrigin, subscriptionStatus } from './data'
import { dateLong, dateTime, pct, travelerTag, vnd } from './format'

export default function Overview() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { vendor, rows, offers } = useVendor()
  const sub = subscriptionStatus(vendor)
  const daysLeft = vendor.plan_paid_until ? Math.ceil((new Date(vendor.plan_paid_until).getTime() - Date.now()) / 86400000) : 0
  const s = computeStats(rows)
  const recent = rows.slice(0, 6)
  const origin = statsByOrigin(rows)

  const tiles: { label: string; value: string; note?: string }[] = [
    { label: t('vStatClaimed'), value: String(s.claimed) },
    { label: t('vStatRedeemed'), value: String(s.redeemed) },
    { label: t('vStatExpired'), value: String(s.expired) },
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

      {sub === 'active' && daysLeft <= 7 && (
        <section className="v-card" style={{ borderColor: 'var(--danger)' }}>
          <div className="v-row" style={{ justifyContent: 'space-between' }}>
            <p>{t('vRenewSoon', { n: daysLeft, d: dateLong(vendor.plan_paid_until as string, lang) })}</p>
            <Link className="v-btn primary" to="/vendor/billing" style={{ textDecoration: 'none' }}>
              {t('vRenewNow')}
            </Link>
          </div>
        </section>
      )}

      {sub !== 'active' && (
        <section className="v-card" style={{ borderColor: 'var(--danger)' }}>
          <div className="v-row" style={{ justifyContent: 'space-between' }}>
            <p>
              {sub === 'inactive'
                ? t('vStatusInactive')
                : t('vStatusExpired', { d: dateLong(vendor.plan_paid_until as string, lang) })}
            </p>
            <Link className="v-btn primary" to="/vendor/billing" style={{ textDecoration: 'none' }}>
              {sub === 'inactive' ? t('vSubscribeNow') : t('vPayNowBtn')}
            </Link>
          </div>
        </section>
      )}

      <section className="v-hero">
        <div className="v-label">
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
        <h2>{t('vOriginTitle')}</h2>
        <p className="v-hint">{t('vOriginNote')}</p>
        <div className="v-table-scroll">
          <table className="v-table">
            <thead>
              <tr>
                <th>{t('vOriginCol')}</th>
                <th className="v-num">{t('vStatClaimed')}</th>
                <th className="v-num">{t('vStatRedeemed')}</th>
                <th className="v-num">{t('vOriginSales')}</th>
              </tr>
            </thead>
            <tbody>
              {(['international', 'domestic', 'unknown'] as const)
                .filter((k) => k !== 'unknown' || origin.unknown.claimed > 0)
                .map((k) => (
                  <tr key={k}>
                    <td>{t(k === 'international' ? 'vOriginInternational' : k === 'domestic' ? 'vOriginDomestic' : 'vOriginUnknown')}</td>
                    <td className="v-num">{origin[k].claimed}</td>
                    <td className="v-num">{origin[k].redeemed}</td>
                    <td className="v-num">{vnd(origin[k].sales, lang)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

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
                        {couponTitle(offers, r.coupon_id, lang)}
                        <div className="v-hint">
                          {t('vTravelerTag', { tag: travelerTag(r.uid) })} · {dateTime(r.redeemed_at ?? r.issued_at, lang)}
                        </div>
                      </td>
                      <td className="v-num">
                        <span className={`v-badge ${r.status === 'used' ? 'used' : ''}`}>
                          {r.status === 'used' ? t('vStatusUsed') : rowExpired(r) ? t('vCouponExpired') : t('vStatusUnused')}
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
