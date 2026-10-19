import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { quests } from '../data/quests'
import { coupons, AVG_BASKET_VND, COMMISSION_RATE } from '../data/coupons'
import { recordIssued } from '../lib/couponLedger'

export interface User {
  name: string
  days: number
  destinations: string[]
}
export interface OwnedCoupon {
  uid: string
  couponId: string
  status: 'unused' | 'used'
}
export interface ChatMessage {
  role: 'user' | 'meilu'
  text: string
}
export interface CommissionEvent {
  uid: string
  couponId: string
  basketVnd: number
  commissionVnd: number
  at: number
}

export const QUEST_SLOTS = 5
export const AD_REWARD = 5
export const AD_DAILY_LIMIT = 3
export const REDEEM_QUEST_ID = 'q8'
export const REDEEM_BONUS_COINS = 10

const today = () => new Date().toISOString().slice(0, 10)

function pickQuests(destinations: string[], exclude: string[], count: number): string[] {
  const relevant = quests.filter((q) => destinations.includes(q.destination))
  const pool = (relevant.length ? relevant : quests).filter((q) => !exclude.includes(q.id))
  // top up from the full list if the filtered pool is too small
  const rest = quests.filter((q) => !exclude.includes(q.id) && !pool.includes(q))
  return [...pool, ...rest].slice(0, count).map((q) => q.id)
}

interface AppState {
  user: User | null
  coins: number
  activeQuestIds: string[]
  questStatus: Record<string, 'done'>
  ownedCoupons: OwnedCoupon[]
  chatHistory: ChatMessage[]
  adWatch: { date: string; count: number }
  commissionEvents: CommissionEvent[]
  /** True once the new-user free coupon (gacha) has been claimed. */
  welcomeGiftClaimed: boolean

  login: (name: string) => void
  setOnboarding: (days: number, destinations: string[]) => void
  addCoins: (n: number) => void
  completeQuest: (id: string) => void
  skipQuest: (id: string) => void
  redeemCoupon: (couponId: string) => boolean
  /** Adds the free welcome coupon once per account. Returns false if already claimed. */
  claimWelcomeCoupon: (couponId: string) => boolean
  useCoupon: (uid: string) => void
  addChat: (m: ChatMessage) => void
  adsLeftToday: () => number
  claimAd: () => boolean
  reset: () => void
}

const initial = {
  user: null,
  coins: 0,
  activeQuestIds: [] as string[],
  questStatus: {} as Record<string, 'done'>,
  ownedCoupons: [] as OwnedCoupon[],
  chatHistory: [] as ChatMessage[],
  adWatch: { date: today(), count: 0 },
  commissionEvents: [] as CommissionEvent[],
  welcomeGiftClaimed: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      login: (name) => set({ user: { name, days: 1, destinations: [] } }),

      setOnboarding: (days, destinations) =>
        set((s) => ({
          user: { name: s.user?.name ?? 'Traveler', days, destinations },
          activeQuestIds: pickQuests(destinations, [], QUEST_SLOTS),
          questStatus: {},
        })),

      addCoins: (n) => set((s) => ({ coins: s.coins + n })),

      completeQuest: (id) => {
        const q = quests.find((x) => x.id === id)
        if (!q || get().questStatus[id]) return
        set((s) => ({
          coins: s.coins + q.rewardCoins,
          questStatus: { ...s.questStatus, [id]: 'done' },
        }))
      },

      // Replace a quest with a new one not already active or done.
      skipQuest: (id) =>
        set((s) => {
          const exclude = [...s.activeQuestIds, ...Object.keys(s.questStatus)]
          const [next] = pickQuests(s.user?.destinations ?? [], exclude, 1)
          const activeQuestIds = s.activeQuestIds
            .map((x) => (x === id ? next : x))
            .filter((x): x is string => !!x)
          return { activeQuestIds }
        }),

      redeemCoupon: (couponId) => {
        const c = coupons.find((x) => x.id === couponId)
        if (!c || get().coins < c.costCoins) return false
        const uid = `${couponId}-${Date.now()}`
        set((s) => ({
          coins: s.coins - c.costCoins,
          ownedCoupons: [...s.ownedCoupons, { uid, couponId, status: 'unused' }],
        }))
        void recordIssued(uid, couponId, 'coins') // visible to the vendor, scannable
        return true
      },

      claimWelcomeCoupon: (couponId) => {
        if (get().welcomeGiftClaimed || !coupons.some((c) => c.id === couponId)) return false
        const uid = `${couponId}-welcome-${Date.now()}`
        set((s) => ({
          welcomeGiftClaimed: true,
          ownedCoupons: [...s.ownedCoupons, { uid, couponId, status: 'unused' }],
        }))
        void recordIssued(uid, couponId, 'welcome')
        return true
      },

      // Vendor scan: mark used, complete the "redeem coupon" quest, bonus coins, log 5% commission.
      useCoupon: (uid) =>
        set((s) => {
          const oc = s.ownedCoupons.find((x) => x.uid === uid)
          if (!oc || oc.status === 'used') return {}
          const questDone = !!s.questStatus[REDEEM_QUEST_ID]
          return {
            ownedCoupons: s.ownedCoupons.map((x) =>
              x.uid === uid ? { ...x, status: 'used' as const } : x,
            ),
            coins: s.coins + REDEEM_BONUS_COINS,
            questStatus: { ...s.questStatus, [REDEEM_QUEST_ID]: 'done' as const },
            activeQuestIds:
              questDone || s.activeQuestIds.includes(REDEEM_QUEST_ID)
                ? s.activeQuestIds
                : [...s.activeQuestIds, REDEEM_QUEST_ID],
            commissionEvents: [
              ...s.commissionEvents,
              {
                uid,
                couponId: oc.couponId,
                basketVnd: AVG_BASKET_VND,
                commissionVnd: AVG_BASKET_VND * COMMISSION_RATE,
                at: Date.now(),
              },
            ],
          }
        }),

      addChat: (m) => set((s) => ({ chatHistory: [...s.chatHistory, m] })),

      adsLeftToday: () => {
        const { adWatch } = get()
        return adWatch.date === today() ? Math.max(0, AD_DAILY_LIMIT - adWatch.count) : AD_DAILY_LIMIT
      },

      claimAd: () => {
        if (get().adsLeftToday() <= 0) return false
        set((s) => ({
          coins: s.coins + AD_REWARD,
          adWatch: {
            date: today(),
            count: (s.adWatch.date === today() ? s.adWatch.count : 0) + 1,
          },
        }))
        return true
      },

      reset: () => set({ ...initial, adWatch: { date: today(), count: 0 } }),
    }),
    { name: 'ecopet-store' },
  ),
)
