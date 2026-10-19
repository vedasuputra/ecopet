import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { quests } from '../data/quests'

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

export const QUEST_SLOTS = 5
export const AD_REWARD = 5
export const AD_DAILY_LIMIT = 3

function pickQuests(destinations: string[], exclude: string[], count: number): string[] {
  const relevant = quests.filter((q) => destinations.includes(q.destination))
  const pool = (relevant.length ? relevant : quests).filter((q) => !exclude.includes(q.id))
  // top up from the full list if the filtered pool is too small
  const rest = quests.filter((q) => !exclude.includes(q.id) && !pool.includes(q))
  return [...pool, ...rest].slice(0, count).map((q) => q.id)
}

/** The server-owned part of the state: refreshed from the database, never written by the browser. */
export interface Economy {
  coins: number
  questStatus: Record<string, 'done'>
  ownedCoupons: OwnedCoupon[]
  welcomeGiftClaimed: boolean
  adWatch: { date: string; count: number }
}

interface AppState extends Economy {
  // --- client-owned: kept in the account's profile, freely editable by the user
  user: User | null
  activeQuestIds: string[]
  chatHistory: ChatMessage[]

  login: (name: string) => void
  setOnboarding: (days: number, destinations: string[]) => void
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
}

const initial = {
  user: null as User | null,
  activeQuestIds: [] as string[],
  chatHistory: [] as ChatMessage[],
  ...initialEconomy,
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
        })),

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
