import { create } from 'zustand'

// The small popup that says "you earned N coins" (after a rewarded ad). Shown from anywhere; Layout renders it.
export const useRewardPopup = create<{
  coins: number | null
  show: (coins: number) => void
  hide: () => void
}>((set) => ({
  coins: null,
  show: (coins) => set({ coins }),
  hide: () => set({ coins: null }),
}))
