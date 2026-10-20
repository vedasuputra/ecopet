import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pickByVariety, slotsForDays, type Itinerary } from '../lib/planner'
import { useCatalog } from './useCatalog'

export interface User {
  name: string
  days: number
  destinations: string[]
}
export interface OwnedCoupon {
  uid: string
  couponId: string
  status: 'unused' | 'used'
  expiresAt?: string | null
}
export interface ChatMessage {
  role: 'user' | 'meilu'
  text: string
}
/** A quest photo that a person has to look at (pending), or that was looked at and not approved. */
export interface ReviewInfo {
  status: 'pending' | 'rejected'
  note?: string | null
}

/** A coupon that was never used and whose expiry date has passed. */
export const isCouponExpired = (c: { status: string; expiresAt?: string | null }) =>
  c.status === 'unused' && !!c.expiresAt && new Date(c.expiresAt) < new Date()

export const AD_REWARD = 5
export const AD_DAILY_LIMIT = 3

/**
 * Picks `count` quests for a trip. The traveler's destinations come first, then the rest; within each
 * group variety wins (a different quest TYPE and DESTINATION from what is already active). Quests in
 * `exclude` (active or done) are never picked, and `have` are the active quests that variety is judged against.
 */
function pickQuests(destinations: string[], exclude: string[], count: number, have: string[] = []): string[] {
  const all = useCatalog.getState().quests
  const haveQ = all.filter((q) => have.includes(q.id))
  const available = all.filter((q) => !exclude.includes(q.id))
  const mine = available.filter((q) => destinations.includes(q.destination))
  const others = available.filter((q) => !destinations.includes(q.destination))
  const first = pickByVariety(mine, count, haveQ)
  const more = first.length < count ? pickByVariety(others, count - first.length, [...haveQ, ...first]) : []
  return [...first, ...more].map((q) => q.id)
}

/** The server-owned part of the state: refreshed from the database, never written by the browser. */
export interface Economy {
  coins: number
  questStatus: Record<string, 'done'>
  ownedCoupons: OwnedCoupon[]
  welcomeGiftClaimed: boolean
  adWatch: { date: string; count: number }
  /** Quests whose latest photo is waiting for review, or was not approved. */
  reviewStatus: Record<string, ReviewInfo>
}

interface AppState extends Economy {
  // --- client-owned: kept in the account's profile, freely editable by the user
  user: User | null
  activeQuestIds: string[]
  chatHistory: ChatMessage[]
  itinerary: Itinerary | null

  login: (name: string) => void
  setOnboarding: (days: number, destinations: string[]) => void
  /** Saves an itinerary (for example after the traveler edited it) without touching the active quests. */
  setItinerary: (it: Itinerary | null) => void
  /** Saves an itinerary and makes the active quests follow it (day by day, skipping finished ones). */
  applyItinerary: (it: Itinerary) => void
  skipQuest: (id: string) => void
  addChat: (m: ChatMessage) => void
  adsLeftToday: () => number
  /** Replace the mirror of the server's economy (see store/economy.ts). */
  setEconomy: (e: Economy) => void
  reset: () => void
}

/** Vietnam calendar day, matching the server's daily ad limit. */
export const vnDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

const initialEconomy: Economy = {
  coins: 0,
  questStatus: {},
  ownedCoupons: [],
  welcomeGiftClaimed: false,
  adWatch: { date: vnDay(new Date()), count: 0 },
  reviewStatus: {},
}

const initial = {
  user: null as User | null,
  activeQuestIds: [] as string[],
  chatHistory: [] as ChatMessage[],
  itinerary: null as Itinerary | null,
  ...initialEconomy,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial,

      login: (name) => set({ user: { name, days: 1, destinations: [] } }),

      // A longer stay gets more quests; finished quests are not suggested again; a changed trip
      // makes the old itinerary stale, so it is cleared.
      setOnboarding: (days, destinations) =>
        set((s) => ({
          user: { name: s.user?.name ?? 'Traveler', days, destinations },
          activeQuestIds: pickQuests(destinations, Object.keys(s.questStatus), slotsForDays(days)),
          itinerary: null,
        })),

      setItinerary: (it) => set({ itinerary: it }),

      applyItinerary: (it) =>
        set((s) => {
          const done = new Set(Object.keys(s.questStatus))
          const slots = slotsForDays(it.tripDays)
          const fromPlan = it.days.flatMap((d) => d.questIds).filter((id) => !done.has(id)).slice(0, slots)
          const topUp =
            fromPlan.length < slots
              ? pickQuests(it.destinations, [...done, ...fromPlan], slots - fromPlan.length, fromPlan)
              : []
          return { itinerary: it, activeQuestIds: [...fromPlan, ...topUp] }
        }),

      // Replace a quest with a new one not already active or done (and different from the others in type).
      skipQuest: (id) =>
        set((s) => {
          const exclude = [...s.activeQuestIds, ...Object.keys(s.questStatus)]
          const keep = s.activeQuestIds.filter((x) => x !== id)
          const [next] = pickQuests(s.user?.destinations ?? [], exclude, 1, keep)
          const activeQuestIds = s.activeQuestIds
            .map((x) => (x === id ? next : x))
            .filter((x): x is string => !!x)
          return { activeQuestIds }
        }),

      addChat: (m) => set((s) => ({ chatHistory: [...s.chatHistory, m] })),

      adsLeftToday: () => {
        const { adWatch } = get()
        return adWatch.date === vnDay(new Date()) ? Math.max(0, AD_DAILY_LIMIT - adWatch.count) : AD_DAILY_LIMIT
      },

      setEconomy: (e) => set(e),

      reset: () => set({ ...initial, adWatch: { date: vnDay(new Date()), count: 0 } }),
    }),
    { name: 'ecopet-store' },
  ),
)
