import { create } from 'zustand'

/** A place on the map of the chat: a search result, a partner shop or one of the destinations of the app. */
export interface MapPlace {
  id: string
  name: string
  detail: string
  lat: number
  lng: number
  kind: 'search' | 'shop' | 'destination' | 'quest'
  vendorId?: string
  questId?: string
}

// The small map of the Meilu chat: whether it is open, the places it shows and the one whose card is open. Shared by the chat and
// the headers of the chat (popup and full screen), which have the button that opens it.
export const useChatMap = create<{
  open: boolean
  places: MapPlace[]
  selected: string | null
  setOpen: (open: boolean) => void
  toggle: () => void
  /** Shows these places (opening the map) and the card of one of them. */
  show: (places: MapPlace[], selectId?: string | null) => void
  select: (id: string | null) => void
}>((set) => ({
  open: false,
  places: [],
  selected: null,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  show: (places, selectId) => set({ open: true, places, selected: selectId ?? places[0]?.id ?? null }),
  select: (selected) => set({ selected }),
}))
