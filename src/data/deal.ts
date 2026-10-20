import type { Key } from '../i18n'

// What a coupon gives. Most are "X% off", but a combo or a free gift is not a percentage, so the kind of deal is saved too.
export type DealType = 'percent' | 'amount' | 'free' | 'combo'
export const DEAL_TYPES: DealType[] = ['percent', 'amount', 'free', 'combo']

export interface Deal {
  dealType?: string | null
  discountPct: number
  dealValue?: number | null // VND, only for 'amount'
}

type T = (key: Key, params?: Record<string, string | number>) => string

const asType = (v: string | null | undefined): DealType => ((DEAL_TYPES as string[]).includes(v ?? '') ? (v as DealType) : 'percent')
/** 20000 -> "20K", 25500 -> "25.500" (a capital K, so it is as big as the number) */
const kvnd = (v: number) => (v % 1000 === 0 ? `${v / 1000}K` : v.toLocaleString('vi-VN'))

/** The short label on the stub of a ticket: "15%", "-20K", "FREE" or "COMBO". */
export function dealShort(d: Deal, t: T): string {
  switch (asType(d.dealType)) {
    case 'amount':
      return `-${kvnd(d.dealValue ?? 0)}`
    case 'free':
      return t('dealFree')
    case 'combo':
      return t('dealCombo')
    default:
      return `${d.discountPct}%`
  }
}

/** A sentence: "15% off", "20K VND off", "Free gift", "Combo deal". */
export function dealLong(d: Deal, t: T): string {
  switch (asType(d.dealType)) {
    case 'amount':
      return t('dealLineAmount', { n: kvnd(d.dealValue ?? 0) })
    case 'free':
      return t('dealLineFree')
    case 'combo':
      return t('dealLineCombo')
    default:
      return t('couponDiscountLine', { pct: d.discountPct })
  }
}

/** The same, for a row of the database (snake_case). */
export const dealOfRow = (r: { deal_type?: string | null; deal_value?: number | null; discount_pct: number }): Deal => ({
  dealType: r.deal_type,
  dealValue: r.deal_value,
  discountPct: r.discount_pct,
})
