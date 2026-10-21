import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT, type Key } from '../i18n'
import { vendorApi } from './api'
import { useVendor } from './context'
import { COMMISSION_RATE } from '../data/coupons'
import { FIRST_PAYMENT_DISCOUNT, invoiceNo, PLANS, subscriptionStatus, type PlanId } from './data'
import { dateLong, num, vnd } from './format'

type Method = 'momo' | 'vnpay' | 'zalopay' | 'card'
type Phase = 'form' | 'processing' | 'approving' | 'paid'

const METHODS: Method[] = ['momo', 'vnpay', 'zalopay', 'card']
const METHOD_KEY: Record<Method, Key> = { momo: 'vMethodMomo', vnpay: 'vMethodVnpay', zalopay: 'vMethodZalopay', card: 'vMethodCard' }
const PLAN_KEY: Record<PlanId, Key> = { monthly: 'vPlanMonthly', semester: 'vPlanSemester', annual: 'vPlanAnnual' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// SIMULATED checkout. It looks like a MoMo / VNPay / ZaloPay / card payment, but nothing is charged:
// "Pay" just asks the server to record a payment and extend the plan, so the whole flow (checkout,
// invoice, active status, fee ledger) can be shown without a real payment gateway.
export default function Billing() {
  const t = useT()
  const lang = useLang((s) => s.lang)
  const { vendor, payments, reload } = useVendor()
  const [plan, setPlan] = useState<PlanId>(vendor.plan)
  const [method, setMethod] = useState<Method>('momo')
  const [phase, setPhase] = useState<Phase>('form')
  const [error, setError] = useState('')
  const [agree, setAgree] = useState(false)
  const [result, setResult] = useState<{ invoice: string; until: string } | null>(null)

  const first = payments.length === 0
  const price = PLANS[plan].price
  const discount = first ? Math.round(price * FIRST_PAYMENT_DISCOUNT) : 0
  const total = price - discount
  const status = subscriptionStatus(vendor)
  const methodName = t(METHOD_KEY[method])

  const pay = async () => {
    setError('')
    if (!agree) return setError(t('vErrCommit'))
    setPhase('processing')
    await sleep(1100)
    setPhase('approving')
    await sleep(2200)
    // a short network or server hiccup must not fail a (simulated) payment: one more try before giving up
    let r = await vendorApi('pay', { plan, method })
    if (!r.ok && r.error !== 'bad_request' && r.error !== 'not_a_vendor') r = await vendorApi('pay', { plan, method })
    if (!r.ok) {
      setPhase('form')
      return setError(`${t('vErrPay')} (${r.error ?? 'unknown'})`) // the reason, so a failure can be traced
    }
    const payment = r.payment as { id: number }
    setResult({ invoice: invoiceNo(payment.id), until: String(r.paidUntil) })
    setPhase('paid')
    await reload()
  }

  return (
    <>
      <div className="v-head">
        <div>
          <h1>{t('vBillingTitle')}</h1>
          <p className="v-sub">{t('vBillingSub')}</p>
        </div>
      </div>

      <section className="v-card" style={{ borderColor: 'var(--danger)' }}>
        <b>{t('vSimBanner')}</b>
      </section>

      {phase === 'paid' && result ? (
        <section className="v-card">
          <h2 className="v-success">✓ {t('vPaid')}</h2>
          <p>{t('vPaidMsg', { d: dateLong(result.until, lang) })}</p>
          <p className="v-hint" style={{ margin: '6px 0 14px' }}>
            {t('vInvoiceNo', { no: result.invoice })} · {t(PLAN_KEY[plan])} · {vnd(total, lang)} · {methodName}
          </p>
          <Link className="v-btn primary" to="/vendor/fees" style={{ textDecoration: 'none' }}>
            {t('vBackToFees')}
          </Link>
        </section>
      ) : phase === 'form' ? (
        <>
          <p style={{ marginBottom: 12 }}>
            {status === 'active'
              ? t('vStatusActive', { d: dateLong(vendor.plan_paid_until as string, lang) })
              : status === 'expired'
                ? t('vStatusExpired', { d: dateLong(vendor.plan_paid_until as string, lang) })
                : t('vStatusInactive')}
          </p>

          <section className="v-card">
            <h2>{t('vIncludesTitle')}</h2>
            <ul className="v-list">
              <li>{t('vIncl1')}</li>
              <li>{t('vIncl2')}</li>
              <li>{t('vIncl3')}</li>
              <li>{t('vIncl4')}</li>
            </ul>
          </section>

          <section className="v-card">
            <h2>{t('vChoosePlan')}</h2>
            <div className="v-grid-tiles" style={{ marginBottom: 0 }}>
              {(Object.keys(PLANS) as PlanId[]).map((p) => (
                <label key={p} className="v-tile" style={{ cursor: 'pointer', borderColor: plan === p ? 'var(--accent)' : undefined, borderWidth: plan === p ? 2 : 1 }}>
                  <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} /> <b>{t(PLAN_KEY[p])}</b>
                  <div className="v-value" style={{ fontSize: '1.15rem' }}>{vnd(PLANS[p].price, lang)}</div>
                  <div className="v-note">{t('vPerMonth', { n: num(PLANS[p].perMonth, lang) })}</div>
                </label>
              ))}
            </div>
          </section>

          <section className="v-card">
            <h2>{t('vPayWith')}</h2>
            <div className="v-row">
              {METHODS.map((m) => (
                <label key={m} className="v-btn" style={{ borderColor: method === m ? 'var(--accent)' : undefined, borderWidth: method === m ? 2 : 1 }}>
                  <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} /> {t(METHOD_KEY[m])}
                </label>
              ))}
            </div>
          </section>

          <section className="v-card">
            <h2>{t('vSummary')}</h2>
            <table className="v-ledger">
              <tbody>
                <tr>
                  <td>{t('vSumPlan')}</td>
                  <td>{t(PLAN_KEY[plan])}</td>
                </tr>
                <tr>
                  <td>{t('vSumPrice')}</td>
                  <td>{vnd(price, lang)}</td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td>{t('vSumDiscount')}</td>
                    <td>− {vnd(discount, lang)}</td>
                  </tr>
                )}
                <tr className="total">
                  <td>{t('vSumTotal')}</td>
                  <td>{vnd(total, lang)}</td>
                </tr>
              </tbody>
            </table>
            <label style={{ display: 'block', marginTop: 12 }}>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> {t('vCommitAgree', { pct: String(COMMISSION_RATE * 100) })}
            </label>
            {error && <p className="v-error">{error}</p>}
            <button className="v-btn primary" style={{ marginTop: 12 }} onClick={() => void pay()}>
              {t('vPayNow', { n: num(total, lang) })}
            </button>
          </section>
        </>
      ) : (
        // fake gateway screens: connecting, then "approve in the app" with a simulated QR (or card form)
        <section className="v-card" style={{ textAlign: 'center' }}>
          <h2>{methodName}</h2>
          {phase === 'processing' ? (
            <p>{t('vProcessing', { m: methodName })}</p>
          ) : method === 'card' ? (
            <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'left' }}>
              <div className="v-field">
                <label>{t('vCardNumber')}</label>
                <input className="v-input" value="4242 4242 4242 4242" readOnly />
              </div>
              <div className="v-row" style={{ flexWrap: 'nowrap' }}>
                <div className="v-field" style={{ flex: 1 }}>
                  <label>{t('vCardExpiry')}</label>
                  <input className="v-input" value="12 / 30" readOnly />
                </div>
                <div className="v-field" style={{ flex: 1 }}>
                  <label>{t('vCardCvc')}</label>
                  <input className="v-input" value="•••" readOnly />
                </div>
              </div>
              <p style={{ textAlign: 'center' }}>{t('vApprove', { m: methodName })}</p>
            </div>
          ) : (
            <>
              <div style={{ background: '#fff', padding: 12, display: 'inline-block', borderRadius: 10 }}>
                <QRCodeSVG value={`SIMULATED-PAYMENT:${method}:${total}`} size={160} />
              </div>
              <p className="v-hint" style={{ margin: '8px 0' }}>
                {t('vScanToPay', { m: methodName })}
              </p>
              <p>{t('vApprove', { m: methodName })}</p>
            </>
          )}
          <p className="v-hint" style={{ marginTop: 10 }}>
            {vnd(total, lang)}
          </p>
        </section>
      )}
    </>
  )
}
