import { create } from 'zustand'

// Triggers the full-screen "Meilu celebrates" moment from anywhere (quest done, coupon used, gift).
export const useCelebration = create<{
  message: string | null
  id: number
  show: (message: string) => void
  hide: () => void
}>((set) => ({
  message: null,
  id: 0,
  show: (message) => set({ message, id: Date.now() }),
  hide: () => set({ message: null }),
}))
