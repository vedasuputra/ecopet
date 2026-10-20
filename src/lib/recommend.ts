import type { Recommendation } from '../data/recommendations'
import { haversine } from './geo'
import type { Interest } from './travelerStyle'

// Ranks places for the Home screen and the Explore map. Three signals are combined:
//   what the traveler likes (the "what kind of traveler are you" answers),
//   the destinations they chose for the trip, and
//   how close the place is to where they are right now.

export type Reason = 'interest' | 'trip' | 'near'

export interface Ranked {
  place: Recommendation
  /** Meters from the traveler, or null when the location is not known. */
  distanceM: number | null
  score: number
  reasons: Reason[]
}

const NEAR_M = 30_000

export function recommend(
  places: Recommendation[],
  opts: { lat?: number | null; lng?: number | null; interests?: Interest[]; destinations?: string[] },
): Ranked[] {
  const interests = opts.interests ?? []
  const destinations = opts.destinations ?? []
  const here = typeof opts.lat === 'number' && typeof opts.lng === 'number'

  return places
    .map((place) => {
      const distanceM = here ? Math.round(haversine(opts.lat as number, opts.lng as number, place.lat, place.lng)) : null
      const overlap = place.tags.filter((t) => interests.includes(t)).length
      const inTrip = destinations.includes(place.destination)
      // closer is better: 3 points at 0 km, 1.5 at 25 km, ~0.6 at 100 km
      const proximity = distanceM === null ? 0 : 3 / (1 + distanceM / 25_000)

      const reasons: Reason[] = []
      if (overlap > 0) reasons.push('interest')
      if (inTrip) reasons.push('trip')
      if (distanceM !== null && distanceM <= NEAR_M) reasons.push('near')

      return { place, distanceM, score: overlap * 2 + (inTrip ? 3 : 0) + proximity, reasons }
    })
    .sort((a, b) => b.score - a.score || (a.distanceM ?? 0) - (b.distanceM ?? 0) || a.place.id.localeCompare(b.place.id))
}
