// Known destinations (placeholder coordinates, replace with real OSM coordinates).
// Used by the dev panel's location shortcuts and to label the traveler's area in Meilu chat.

import { haversine } from '../lib/geo'

export interface KnownPlace {
  name: string
  lat: number
  lng: number
}

export const PLACES: KnownPlace[] = [
  { name: 'Can Tho', lat: 10.0452, lng: 105.7469 },
  { name: 'Cai Rang Floating Market', lat: 10.0035, lng: 105.7479 },
  { name: 'Ben Tre', lat: 10.2434, lng: 106.3756 },
  { name: 'Tra Su', lat: 10.5833, lng: 105.0667 },
  { name: 'Vinh Long', lat: 10.2537, lng: 105.9722 },
]

// Only treat the traveler as "at" a known destination when really close to it.
const AT_M = 1500

/** Closest known destination and how far it is (meters). */
export function nearestKnown(lat: number, lng: number): { name: string; distanceM: number } {
  let best = PLACES[0]
  let bestD = Infinity
  for (const p of PLACES) {
    const d = haversine(lat, lng, p.lat, p.lng)
    if (d < bestD) {
      best = p
      bestD = d
    }
  }
  return { name: best.name, distanceM: Math.round(bestD) }
}

/**
 * Short, human area name for the current location. A known destination only within 1.5 km,
 * otherwise the last part of the reverse-geocoded name (the city), so it works anywhere.
 */
export function areaLabel(lat: number, lng: number, placeName: string): string {
  const n = nearestKnown(lat, lng)
  if (n.distanceM <= AT_M) return n.name
  return placeName.split(',').pop()?.trim() || placeName
}
