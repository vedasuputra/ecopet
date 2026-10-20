// A coupon's category is the category of its shop. The vendor chooses it (vendors.kind in the database). Older shops
// without one are guessed from the free-text type they wrote ("Cafe", "Crafts"...).
export type CouponCategory = 'food_drink' | 'shopping' | 'activity' | 'other'
export const COUPON_KINDS: CouponCategory[] = ['food_drink', 'shopping', 'activity', 'other']

const FOOD = /(food|drink|fruit|cafe|coffee|tea|restaurant|eatery|bakery|juice|snack|noodle|bar\b|kitchen|beverage)/i
const SHOP = /(souvenir|craft|gift|shop|store|market|fashion|clothes|boutique|handmade|goods)/i
const ACTIVITY = /(bike|bicycle|rental|tour|boat|trip|guide|experience|activity|kayak|homestay)/i

export function couponCategory(shopType: string, kind?: string | null): CouponCategory {
  if (kind && (COUPON_KINDS as string[]).includes(kind)) return kind as CouponCategory
  if (FOOD.test(shopType)) return 'food_drink'
  if (SHOP.test(shopType)) return 'shopping'
  if (ACTIVITY.test(shopType)) return 'activity'
  return 'other'
}

// Material Symbols names (already loaded in index.html)
export const COUPON_CATEGORY_ICON: Record<CouponCategory, string> = {
  food_drink: 'restaurant',
  shopping: 'shopping_bag',
  activity: 'directions_bike',
  other: 'confirmation_number',
}
