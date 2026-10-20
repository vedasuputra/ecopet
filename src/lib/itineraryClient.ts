import { requestItinerary } from './api'
import { rulePlan, type Itinerary, type PlanQuest, type PlanVendor } from './planner'
import type { TravelerStyle } from './travelerStyle'
import { useCatalog } from '../store/useCatalog'

/** The quests and vendors known to this device, in the shape the planner uses. */
export function planCatalog(): { quests: PlanQuest[]; vendors: PlanVendor[] } {
  const { quests, vendors } = useCatalog.getState()
  return {
    quests: quests.map((q) => ({ id: q.id, type: q.type, destination: q.destination, title: q.title.en, lat: q.lat, lng: q.lng })),
    vendors: vendors.map((v) => ({ id: v.id, name: v.name, category: v.category.en, lat: v.lat, lng: v.lng })),
  }
}

/**
 * Builds an itinerary. With `ai` the server asks Gemini (and returns a rule-based plan itself if the
 * AI is unavailable or over its limit). Without `ai`, or if the server cannot be reached at all,
 * the plan is made on this device from the same rules, so the traveler always gets one.
 */
export async function planTrip(opts: { days: number; destinations: string[]; lang: 'en' | 'vi'; ai: boolean; style?: TravelerStyle | null }): Promise<Itinerary> {
  const local = (fallback: string) => rulePlan({ days: opts.days, destinations: opts.destinations, lang: opts.lang, style: opts.style, ...planCatalog() }, fallback)
  if (!opts.ai) return local('chosen')
  const r = await requestItinerary({ days: opts.days, destinations: opts.destinations, language: opts.lang, style: opts.style ?? undefined })
  if (r.ok && r.itinerary) return r.itinerary as Itinerary
  return local('offline')
}
