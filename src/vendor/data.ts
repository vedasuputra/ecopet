import type { Lang } from '../i18n'
import type { OpenHours } from '../lib/openHours'

export interface IssuedRow {
  uid: string
  user_id: string
  coupon_id: string
  vendor_id: string
  discount_pct: number
  source: 'coins' | 'welcome'
  status: 'unused' | 'used'
  issued_at: string
  expires_at: string | null
  redeemed_at: string | null
  amount_vnd: number | null
  commission_vnd: number | null
}

export interface VendorInfo {
  id: string
  name: string
  category_en: string
  category_vi: string
  plan: PlanId
  plan_started_at: string | null
  plan_paid_until: string | null
  address: string | null
  open_hours: OpenHours | null
}

export interface Offer {
  id: string
  vendor_id: string
  title_en: string
  title_vi: string
  discount_pct: number
  cost_coins: number
  code: string
  active: boolean
  valid_days: number
  monthly_cap: number | null
}

export interface Payment {
  id: number
  vendor_id: string
  plan: PlanId
  amount_vnd: number
  discount_vnd: number
  method: 'momo' | 'vnpay' | 'zalopay' | 'card'
  status: 'paid'
  period_start: string
  period_end: string
  created_at: string
}

export const invoiceNo = (id: number) => `EP-${String(id).padStart(5, '0')}`

// Prices from the business plan. Six-month and annual plans are prepaid; new vendors get 10% off the first payment.
export const PLANS = {
  monthly: { price: 349000, months: 1, perMonth: 349000 },
  semester: { price: 1794000, months: 6, perMonth: 299000 },
  annual: { price: 2988000, months: 12, perMonth: 249000 },
} as const
export type PlanId = keyof typeof PLANS
export const FIRST_PAYMENT_DISCOUNT = 0.1
export const firstPayment = (plan: PlanId) => Math.round(PLANS[plan].price * (1 - FIRST_PAYMENT_DISCOUNT))

/** Title of one of this vendor's coupons (from the database), in the chosen language. */
export const couponTitle = (offers: Offer[], couponId: string, lang: Lang) => {
  const o = offers.find((x) => x.id === couponId)
  return o ? (lang === 'vi' ? o.title_vi : o.title_en) : couponId
}

/** A coupon nobody used before its expiry date. */
export const rowExpired = (r: Pick<IssuedRow, 'status' | 'expires_at'>) =>
  r.status === 'unused' && !!r.expires_at && new Date(r.expires_at) < new Date()

export interface Stats {
  expired: number
  claimed: number
  redeemed: number
  rate: number
  travelers: number
  sales: number
  commission: number
  net: number
  avgBill: number
  discountGiven: number
}

export function computeStats(rows: IssuedRow[]): Stats {
  const used = rows.filter((r) => r.status === 'used')
  const sales = used.reduce((a, r) => a + (r.amount_vnd ?? 0), 0)
  const commission = used.reduce((a, r) => a + (r.commission_vnd ?? 0), 0)
  // amount is what the traveler paid AFTER the discount, so the discount given = paid * d / (1 - d)
  const discountGiven = used.reduce((a, r) => {
    const d = r.discount_pct / 100
    return a + Math.round(((r.amount_vnd ?? 0) * d) / (1 - d))
  }, 0)
  return {
    expired: rows.filter(rowExpired).length,
    claimed: rows.length,
    redeemed: used.length,
    rate: rows.length ? used.length / rows.length : 0,
    travelers: new Set(rows.map((r) => r.user_id)).size,
    sales,
    commission,
    net: sales - commission,
    avgBill: used.length ? Math.round(sales / used.length) : 0,
    discountGiven,
  }
}

export interface DayPoint {
  key: string // YYYY-MM-DD (local)
  date: Date
  claimed: number
  redeemed: number
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Claimed (by issue date) and redeemed (by redeem date) coupons for each of the last `days` days. */
export function dailySeries(rows: IssuedRow[], days = 14): DayPoint[] {
  const points: DayPoint[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    points.push({ key: dayKey(d), date: d, claimed: 0, redeemed: 0 })
  }
  const byKey = new Map(points.map((p) => [p.key, p]))
  for (const r of rows) {
    const c = byKey.get(dayKey(new Date(r.issued_at)))
    if (c) c.claimed++
    if (r.redeemed_at) {
      const x = byKey.get(dayKey(new Date(r.redeemed_at)))
      if (x) x.redeemed++
    }
  }
  return points
}

export type SubscriptionStatus = 'active' | 'expired' | 'inactive'

/** Is the vendor's subscription paid up? (null = never paid.) */
export function subscriptionStatus(v: Pick<VendorInfo, 'plan_paid_until'>): SubscriptionStatus {
  if (!v.plan_paid_until) return 'inactive'
  return new Date(v.plan_paid_until) > new Date() ? 'active' : 'expired'
}
