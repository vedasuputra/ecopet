export interface Coupon {
  id: string
  vendorId: string
  title: string
  costCoins: number
  discountPct: number
  code: string // short alphanumeric fallback code
}

export const coupons: Coupon[] = [
  { id: 'c1', vendorId: 'v1', title: 'Diskon buah segar', costCoins: 40, discountPct: 10, code: 'BT10' },
  { id: 'c2', vendorId: 'v2', title: 'Diskon kopi', costCoins: 50, discountPct: 15, code: 'SX15' },
  { id: 'c3', vendorId: 'v3', title: 'Diskon banh xeo', costCoins: 60, discountPct: 20, code: 'CL20' },
  { id: 'c4', vendorId: 'v4', title: 'Diskon permen kelapa', costCoins: 45, discountPct: 10, code: 'CB10' },
  { id: 'c5', vendorId: 'v5', title: 'Diskon kerajinan', costCoins: 80, discountPct: 25, code: 'MC25' },
  { id: 'c6', vendorId: 'v6', title: 'Diskon sewa sepeda', costCoins: 55, discountPct: 20, code: 'GB20' },
]

export const AVG_BASKET_VND = 150000
export const COMMISSION_RATE = 0.05
