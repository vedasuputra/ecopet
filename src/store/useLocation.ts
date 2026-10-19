import { create } from 'zustand'

export interface LocationState {
  source: 'real' | 'simulated'
  lat: number
  lng: number
  placeName: string
  accuracy: number | null
  setSimulated: (lat: number, lng: number, placeName: string) => void
}

// Stub: fixed value near Can Tho. Real geolocation + Photon autocomplete come later.
// All pages must read location from here, never from navigator.geolocation directly.
export const useLocation = create<LocationState>((set) => ({
  source: 'simulated',
  lat: 10.0452,
  lng: 105.7469,
  placeName: 'Can Tho',
  accuracy: null,
  setSimulated: (lat, lng, placeName) =>
    set({ source: 'simulated', lat, lng, placeName, accuracy: null }),
}))
