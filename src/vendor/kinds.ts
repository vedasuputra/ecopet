import type { Key } from '../i18n'
import type { CouponCategory } from '../data/couponCategory'

export const KIND_KEY: Record<CouponCategory, Key> = {
  food_drink: 'vKindFood',
  shopping: 'vKindShopping',
  activity: 'vKindActivity',
  other: 'vKindOther',
}
