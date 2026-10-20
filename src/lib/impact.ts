import type { Quest } from '../data/quests'
import type { OwnedCoupon } from '../store/useAppStore'

// What a traveler did for the Mekong Delta, counted from what they really finished (never invented). Used on the trip memory card.
export interface Impact {
  questsDone: number
  busRides: number // a bus instead of a private vehicle
  plasticFree: number // their own bottle or their own utensils instead of single-use plastic
  localBusinesses: number // local quests (markets, family workshops, orchards, eateries) plus the shops whose coupons they used
  outdoor: number // on foot, by bike or in a hand-rowed boat
  couponsUsed: number
}

const LOCAL = ['floating_market', 'traditional_market', 'local_goods', 'craft', 'orchard', 'local_food', 'flowers']

export function tripImpact(quests: Quest[], questStatus: Record<string, string>, owned: OwnedCoupon[], vendorOf: (couponId: string) => string | undefined): Impact {
  const done = quests.filter((q) => questStatus[q.id] === 'done')
  const count = (types: string[]) => done.filter((q) => types.includes(q.type)).length
  const used = owned.filter((oc) => oc.status === 'used')
  const shops = new Set(used.map((oc) => vendorOf(oc.couponId)).filter(Boolean))
  return {
    questsDone: done.length,
    busRides: count(['bus']),
    plasticFree: count(['reusable_bottle', 'reusable_utensils']),
    localBusinesses: count(LOCAL) + shops.size,
    outdoor: count(['hiking', 'cycling', 'rowing']),
    couponsUsed: used.length,
  }
}

// True things about the Mekong Delta for the bottom of the card (general knowledge, no made-up numbers). Each one is short, because it has to
// fit on ONE line of the card.
export const FUN_FACTS: { en: string; vi: string }[] = [
  { en: "The Delta grows half of Vietnam's rice.", vi: 'Miền Tây trồng nửa số lúa của Việt Nam.' },
  { en: 'Floating markets are busiest at dawn.', vi: 'Chợ nổi nhộn nhịp nhất lúc rạng sáng.' },
  { en: 'About 17 million people live in the Delta.', vi: 'Khoảng 17 triệu người sống ở miền Tây.' },
  { en: 'Cai Rang boats hang goods on a pole.', vi: 'Ghe Cái Răng treo hàng lên cây bẹo.' },
  { en: 'Fruit boats sell right on the river.', vi: 'Ghe bán trái cây ngay trên sông.' },
  { en: 'Countless canals cross the Delta.', vi: 'Miền Tây chằng chịt kênh rạch.' },
]
