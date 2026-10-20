import type { Localized } from '../i18n'

export interface Coupon {
  id: string
  vendorId: string
  title: Localized
  costCoins: number
  discountPct: number // for a percent deal; 0 for the others
  dealType?: 'percent' | 'amount' | 'free' | 'combo' // default 'percent'
  dealValue?: number | null // VND, for an 'amount' deal
  code: string // short alphanumeric fallback code
  active?: boolean // false = paused by the vendor; default true
  validDays?: number // days a coupon stays usable after a traveler gets it (1 to 7, default 7)
  monthlyCap?: number | null // most coupons handed out per month; null/undefined = unlimited
  remaining?: number | null // left this month (null = unlimited); filled in from the database
}

export const coupons: Coupon[] = [
  { id: 'c1', vendorId: 'v1', title: { en: 'Fresh fruit discount', vi: 'Giảm giá trái cây tươi' }, costCoins: 40, discountPct: 10, code: 'BT10' },
  { id: 'c2', vendorId: 'v2', title: { en: 'Coffee discount', vi: 'Giảm giá cà phê' }, costCoins: 50, discountPct: 15, code: 'SX15' },
  { id: 'c3', vendorId: 'v3', title: { en: 'Banh xeo discount', vi: 'Giảm giá bánh xèo' }, costCoins: 60, discountPct: 20, code: 'CL20' },
  { id: 'c4', vendorId: 'v4', title: { en: 'Coconut candy discount', vi: 'Giảm giá kẹo dừa' }, costCoins: 45, discountPct: 10, code: 'CB10' },
  { id: 'c5', vendorId: 'v5', title: { en: 'Crafts discount', vi: 'Giảm giá đồ thủ công' }, costCoins: 80, discountPct: 25, code: 'MC25' },
  { id: 'c6', vendorId: 'v6', title: { en: 'Bike rental discount', vi: 'Giảm giá thuê xe đạp' }, costCoins: 55, discountPct: 20, code: 'GB20' },
]

export const AVG_BASKET_VND = 150000
export const COMMISSION_RATE = 0.05
