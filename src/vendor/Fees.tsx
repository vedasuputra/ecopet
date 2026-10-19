import { Link } from 'react-router-dom'
import { useLang, useT, type Key } from '../i18n'
import { useVendor } from './context'
import { computeStats, firstPayment, invoiceNo, PLANS, subscriptionStatus, type PlanId } from './data'
import { dateLong, dateShort, num, vnd } from './format'

const PLAN_LABEL: Record<PlanId, Key> = {
  monthly: 'vPlanMonthly',
  semester: 'vPlanSemester',
  annual: 'vPlanAnnual',
}
const METHOD_LABEL: Record<string, Key> = { momo: 'vMethodMomo', vnpay: 'vMethodVnpay', zalopay: 'vMethodZalopay', card: 'vMethodCard' }

// Full transparency: the plan and its status, every payment, every fee Eco-Pet takes, and how Eco-Pet earns overall.
export default function Fees() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { vendor, rows, payments } = useVendor()
  const s = computeStats(rows)
  const plan = PLANS[vendor.plan]
  const status = subscriptionStatus(vendor)
  const subscriptionPaid = payments.reduce((a, p) => a + p.amount_vnd, 0)
  const totalFees = subscriptionPaid + s.commission
  const netAfter = s.sales - totalFees

  return (
    <>
      <div className="v-head">
        <div>
          <h1>{t('vFees')}</h1>
          <p className="v-sub">{t('vFeesSub')}</p>
        </div>
        <Link className="v-btn primary" to="/vendor/billing" style={{ textDecoration: 'none' }}>
          {t('vPayNowBtn')}
        </Link>
      </div>

      <div className="v-two">
        <section className="v-card">
          <h2>{t('vYourPlan')}</h2>
          <p style={{ fontSize: '1.2rem', fontWeight: 650 }}>{t(PLAN_LABEL[vendor.plan])}</p>
          <p>{t('vPerMonth', { n: num(plan.perMonth, lang) })}</p>
          <p className="v-hint">{t('vTotalFor', { n: num(plan.price, lang), m: plan.months })}</p>
          <p style={{ marginTop: 8 }} className={status === 'active' ? 'v-success' : 'v-error'}>
            {status === 'active'
              ? t('vStatusActive', { d: dateLong(vendor.plan_paid_until as string, lang) })
              : status === 'expired'
                ? t('vStatusExpired', { d: dateLong(vendor.plan_paid_until as string, lang) })
                : t('vStatusInactive')}
          </p>
          {payments.length === 0 && <p className="v-hint">{t('vFirstPayment', { n: num(firstPayment(vendor.plan), lang) })}</p>}
        </section>

        <section className="v-card">
          <h2>{t('vFeeLedger')}</h2>
          <table className="v-ledger">
            <tbody>
              <tr>
                <td>{t('vFeeSub')}</td>
                <td>{vnd(subscriptionPaid, lang)}</td>
              </tr>
              <tr>
                <td>{t('vFeeComm')}</td>
                <td>{vnd(s.commission, lang)}</td>
              </tr>
              <tr className="total">
                <td>{t('vFeeTotal')}</td>
                <td>{vnd(totalFees, lang)}</td>
              </tr>
            </tbody>
          </table>
          <p className="v-hint" style={{ marginTop: 8 }}>
            {t('vPrototypeBilling')}
          </p>
        </section>
      </div>

      <section className="v-card">
        <table className="v-ledger">
          <tbody>
            <tr>
              <td>{t('vSalesVia')}</td>
              <td>{vnd(s.sales, lang)}</td>
            </tr>
            <tr>
              <td>− {t('vFeeTotal')}</td>
              <td>{vnd(totalFees, lang)}</td>
            </tr>
            <tr className="total">
              <td>{t('vNetAfter')}</td>
              <td>{vnd(netAfter, lang)}</td>
            </tr>
          </tbody>
        </table>
        {totalFees > 0 && s.sales > 0 && <p style={{ marginTop: 10 }}>{t('vReturn', { x: (s.sales / totalFees).toFixed(1) })}</p>}
        <p className="v-hint" style={{ marginTop: 6 }}>
          {t('vNetNote')}
        </p>
      </section>

      <section className="v-card">
        <h2>{t('vPayHistory')}</h2>
        {payments.length === 0 ? (
          <p className="v-empty">{t('vNoPayments')}</p>
        ) : (
          <div className="v-table-scroll">
            <table className="v-table">
              <thead>
                <tr>
                  <th>{t('vColInvoice')}</th>
                  <th>{t('vColDate')}</th>
                  <th>{t('vPlanCol')}</th>
                  <th className="hide-sm">{t('vColMethod')}</th>
                  <th className="hide-sm">{t('vColPeriod')}</th>
                  <th className="v-num">{t('vColPaid')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{invoiceNo(p.id)}</td>
                    <td>{dateShort(p.created_at, lang)}</td>
                    <td>{t(PLAN_LABEL[p.plan])}</td>
                    <td className="hide-sm">{t(METHOD_LABEL[p.method])}</td>
                    <td className="hide-sm">
                      {dateShort(p.period_start, lang)} → {dateShort(p.period_end, lang)}
                    </td>
                    <td className="v-num">{vnd(p.amount_vnd, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="v-two">
        <section className="v-card">
          <h2>{t('vAllPlans')}</h2>
          <div className="v-table-scroll">
            <table className="v-table">
              <thead>
                <tr>
                  <th>{t('vPlanCol')}</th>
                  <th className="v-num">{t('vPriceCol')}</th>
                  <th className="v-num">{t('vPerMonthCol')}</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PLANS) as PlanId[]).map((p) => (
                  <tr key={p}>
                    <td>{t(PLAN_LABEL[p])}</td>
                    <td className="v-num">{vnd(PLANS[p].price, lang)}</td>
                    <td className="v-num">{vnd(PLANS[p].perMonth, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="v-card">
          <h2>{t('vWhyTitle')}</h2>
          <ul className="v-list">
            <li>{t('vWhy1')}</li>
            <li>{t('vWhy2')}</li>
            <li>{t('vWhy3')}</li>
            <li>{t('vWhy4')}</li>
          </ul>
        </section>
      </div>
    </>
  )
}
