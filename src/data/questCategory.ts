import type { Key } from '../i18n'
import type { QuestType } from './quests'

// What kind of thing a quest is about, for the category filter. Every quest type belongs to one category.
export type QuestCategory = 'activity' | 'food' | 'transport' | 'shopping' | 'eco'
export const QUEST_CATEGORIES: QuestCategory[] = ['activity', 'food', 'transport', 'shopping', 'eco']

export const QUEST_CATEGORY_OF: Record<QuestType, QuestCategory> = {
  hiking: 'activity',
  rowing: 'activity',
  cycling: 'activity',
  local_food: 'food',
  orchard: 'food',
  bus: 'transport',
  floating_market: 'shopping',
  traditional_market: 'shopping',
  craft: 'shopping',
  local_goods: 'shopping',
  flowers: 'shopping',
  reusable_bottle: 'eco',
  reusable_utensils: 'eco',
  redeem_coupon: 'eco',
}

export const QUEST_CATEGORY_KEY: Record<QuestCategory, Key> = {
  activity: 'qcatActivity',
  food: 'qcatFood',
  transport: 'qcatTransport',
  shopping: 'qcatShopping',
  eco: 'qcatEco',
}
