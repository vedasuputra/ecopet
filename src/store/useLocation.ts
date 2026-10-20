import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { reverseGeocode } from '../lib/geocode'
import { haversine } from '../lib/geo'

export interface LocationState {
  source: 'real' | 'simulated'
  lat: number
  lng: number
  placeName: string
  accuracy: number | null
  status: 'idle' | 'requesting' | 'denied' | 'unsupported' | 'error'
  /** True once the user picked a simulated spot on purpose (search, drag, dev panel). */
  userChose: boolean
  /** Simulate being at a place. Resolves the place name by reverse geocoding when none is given. */
  setSimulated: (lat: number, lng: number, placeName?: string) => void
  /** Switch to the device's GPS. Asks for permission when called (must be a user action). */
  startReal: () => void
  stopReal: () => void
}

// Single source of truth for location: quests, Meilu chat, map and verification read ONLY from here,
// never from navigator.geolocation directly.
let watchId: number | null = null
let lastGeocoded: { lat: number; lng: number } | null = null

export const useLocation = create<LocationState>()(
  persist(
    (set, get) => {
      const nameFor = async (lat: number, lng: number) => {
        const name = await reverseGeocode(lat, lng)
        // ignore if the user already moved elsewhere
        if (get().lat === lat && get().lng === lng) set({ placeName: name })
        else if (get().source === 'real') set({ placeName: name })
      }

      return {
        source: 'simulated',
        lat: 10.03369,
        lng: 105.78843,
        placeName: 'Can Tho',
        accuracy: null,
        status: 'idle',
        userChose: false,

        setSimulated: (lat, lng, placeName) => {
          get().stopReal()
          set({ source: 'simulated', lat, lng, placeName: placeName ?? '…', accuracy: null, status: 'idle', userChose: true })
          if (!placeName) void nameFor(lat, lng)
        },

        startReal: () => {
          if (!('geolocation' in navigator)) return set({ status: 'unsupported' })
          if (watchId !== null) return
          set({ status: 'requesting' })
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const { latitude: lat, longitude: lng, accuracy } = pos.coords
              set({ source: 'real', lat, lng, accuracy, status: 'idle' })
              // Only reverse geocode after moving a fair distance (keeps requests rare)
              if (!lastGeocoded || haversine(lat, lng, lastGeocoded.lat, lastGeocoded.lng) > 300) {
                lastGeocoded = { lat, lng }
                void nameFor(lat, lng)
              }
            },
            (err) => {
              get().stopReal()
              set({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error' })
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
          )
        },

        stopReal: () => {
          if (watchId !== null) navigator.geolocation.clearWatch(watchId)
          watchId = null
          lastGeocoded = null
        },
      }
    },
    {
      name: 'ecopet-location',
      // Only remember the simulated spot; real GPS must be re-requested each session.
      partialize: (s) => ({ lat: s.lat, lng: s.lng, placeName: s.placeName, userChose: s.userChose }),
    },
  ),
)
