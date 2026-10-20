// Known destinations (coordinates from OpenStreetMap / Wikidata).
// Used by the dev panel's location shortcuts and to label the traveler's area in Meilu chat.

import { haversine } from '../lib/geo.js'

export interface KnownPlace {
  name: string
  lat: number
  lng: number
}

export const PLACES: KnownPlace[] = [
  { name: 'Can Tho', lat: 10.03369, lng: 105.78843 }, // Ninh Kieu Wharf
  { name: 'Cai Rang Floating Market', lat: 10.0024, lng: 105.74439 },
  { name: 'Ben Tre', lat: 10.23499, lng: 106.37597 }, // Ben Tre market
  { name: 'Vinh Long', lat: 10.25576, lng: 105.9731 }, // Vinh Long market
  { name: 'My Tho', lat: 10.35724, lng: 106.36789 }, // My Tho market
  { name: 'Sa Dec', lat: 10.2912, lng: 105.76773 }, // Sa Dec market
  { name: 'Chau Doc', lat: 10.71108, lng: 105.11888 }, // Chau Doc market
  { name: 'Tra Su', lat: 10.5859, lng: 105.05827 },
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
