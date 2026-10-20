import type { QuestType } from './quests'

// Material Symbols names (the icon font is loaded in index.html: add a new name there too).
export const QUEST_ICON: Record<QuestType, string> = {
  floating_market: 'sailing',
  traditional_market: 'storefront',
  hiking: 'hiking',
  bus: 'directions_bus',
  reusable_bottle: 'water_drop',
  reusable_utensils: 'restaurant',
  redeem_coupon: 'redeem',
  local_food: 'ramen_dining',
  rowing: 'rowing',
  cycling: 'directions_bike',
  craft: 'palette',
  local_goods: 'shopping_bag',
  orchard: 'nutrition',
  flowers: 'local_florist',
}
