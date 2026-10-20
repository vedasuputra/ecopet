import { PLACES } from '../data/places'
import { haversine } from './geo'

// Trip planning rules shared by the app and the server: how many quests a trip gets, how quests are
// picked (variety first), the rule-based itinerary, and the checks that make an AI itinerary safe
// (it may only use quests, vendors and destinations that exist in the database).

export interface PlanQuest {
  id: string
  type: string
  destination: string
  title: string
  lat: number
  lng: number
}
export interface PlanVendor {
  id: string
  name: string
  category: string
  lat: number
  lng: number
}
export interface ItineraryDay {
  day: number
  destination: string
  theme: string
  questIds: string[]
  vendorIds: string[]
  note: string
}
export interface Itinerary {
  source: 'ai' | 'rules'
  createdAt: string
  tripDays: number
  destinations: string[]
  summary: string
  days: ItineraryDay[]
  /** Why the AI was not used when source is 'rules': 'rate_limit' | 'limit' | 'invalid' | 'error' | 'offline' | 'chosen' */
  fallback?: string
}

export const MAX_QUESTS_PER_DAY = 3
export const MAX_VENDORS_PER_DAY = 2

/** A longer stay gets more active quests: 1 day = 3, 2 days = 4, ... up to 8. */
export const slotsForDays = (days: number) => Math.min(8, 2 + Math.max(1, Math.round(days)))

const coordsOf = (dest: string) => PLACES.find((p) => p.name === dest)

/**
 * Picks `count` quests from `pool`, one at a time, always preferring a quest TYPE and a DESTINATION
 * that `have` (and the earlier picks) do not cover yet. Ties keep the original (database) order.
 */
export function pickByVariety<T extends { type: string; destination: string }>(pool: T[], count: number, have: { type: string; destination: string }[] = []): T[] {
  const types = new Set(have.map((q) => q.type))
  const dests = new Set(have.map((q) => q.destination))
  const left = [...pool]
  const chosen: T[] = []
  while (chosen.length < count && left.length) {
    let best = 0
    let bestScore = -1
    left.forEach((q, i) => {
      const score = (types.has(q.type) ? 0 : 2) + (dests.has(q.destination) ? 0 : 1)
      if (score > bestScore) {
        best = i
        bestScore = score
      }
    })
    const [q] = left.splice(best, 1)
    chosen.push(q)
    types.add(q.type)
    dests.add(q.destination)
  }
  return chosen
}

/** The vendors closest to a destination (within maxKm). */
export function nearestVendors(dest: string, vendors: PlanVendor[], n = MAX_VENDORS_PER_DAY, maxKm = 20): PlanVendor[] {
  const c = coordsOf(dest)
  if (!c) return []
  return vendors
    .map((v) => ({ v, d: haversine(c.lat, c.lng, v.lat, v.lng) }))
    .filter((x) => x.d <= maxKm * 1000)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.v)
}

const T = {
  dayTheme: (lang: string, n: number, dest: string) => (lang === 'vi' ? `Ngày ${n}: ${dest}` : `Day ${n}: ${dest}`),
  freeTheme: (lang: string, n: number, dest: string) => (lang === 'vi' ? `Ngày ${n}: tự do khám phá ${dest}` : `Day ${n}: free time in ${dest}`),
  summary: (lang: string, days: number, dests: string[]) =>
    lang === 'vi' ? `Kế hoạch ${days} ngày: ${dests.join(', ')}` : `${days}-day plan: ${dests.join(', ')}`,
}

export interface PlanContext {
  days: number
  destinations: string[]
  quests: PlanQuest[]
  vendors: PlanVendor[]
  lang: string
}

/** The plan without AI: destinations in turn, 3 varied quests a day, the closest partner shops. */
export function rulePlan(ctx: PlanContext, fallback = 'chosen'): Itinerary {
  const days = Math.max(1, Math.min(14, Math.round(ctx.days)))
  const known = [...new Set(ctx.quests.map((q) => q.destination))]
  const dests = ctx.destinations.length ? ctx.destinations : known
  const used = new Set<string>()
  const out: ItineraryDay[] = []

  for (let i = 0; i < days; i++) {
    const dest = dests[i % dests.length]
    let chosen = pickByVariety(ctx.quests.filter((q) => q.destination === dest && !used.has(q.id)), MAX_QUESTS_PER_DAY)
    if (chosen.length < 2) {
      // not enough quests in this destination: top up with the closest unused ones elsewhere
      const c = coordsOf(dest)
      const extra = ctx.quests
        .filter((q) => !used.has(q.id) && !chosen.some((x) => x.id === q.id))
        .sort((a, b) => (c ? haversine(c.lat, c.lng, a.lat, a.lng) - haversine(c.lat, c.lng, b.lat, b.lng) : 0))
      chosen = [...chosen, ...pickByVariety(extra, 2 - chosen.length, chosen)]
    }
    chosen.forEach((q) => used.add(q.id))
    out.push({
      day: i + 1,
      destination: dest,
      theme: chosen.length ? T.dayTheme(ctx.lang, i + 1, dest) : T.freeTheme(ctx.lang, i + 1, dest),
      questIds: chosen.map((q) => q.id),
      vendorIds: nearestVendors(dest, ctx.vendors).map((v) => v.id),
      note: '',
    })
  }
  return { source: 'rules', createdAt: new Date().toISOString(), tripDays: days, destinations: dests, summary: T.summary(ctx.lang, days, dests), days: out, fallback }
}

/**
 * Free text written by an AI is the only part of a plan that is not checked against the database,
 * so facts that tend to be invented (opening hours, prices, phone numbers, links) are removed.
 * Returns '' when the text looks like it states one.
 */
export function sanitizeNote(s: unknown, max: number): string {
  if (typeof s !== 'string') return ''
  const t = s.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const risky = [
    /https?:\/\/|www\./i,
    /\b\d{1,2}\s?(?::|h|giờ)\s?\d{0,2}\s?(?:am|pm)?\b/i, // 7:30, 7h, 7 giờ
    /\b\d{1,2}\s?(?:am|pm)\b/i, // 6am
    /\d[\d.,]*\s?(?:vnd|vnđ|đ|usd|k\b)/i, // prices
    /(?:\$|€|£)\s?\d/,
    /\b(?:open|opens|opening|closes|closing|closed|mở cửa|đóng cửa)\b[^.]*\d/i,
    /\d{8,}/, // phone-like numbers
  ]
  if (risky.some((r) => r.test(t))) return ''
  return t.slice(0, max)
}

const uniq = <T>(a: T[]) => [...new Set(a)]

/**
 * Turns the raw JSON an AI returned into a plan that is guaranteed safe to store and show:
 * every quest/vendor id exists, no quest is used twice, destinations are the traveler's own,
 * there are exactly `days` days, and free text has been stripped of invented facts.
 * Returns null when nothing usable is left (the caller then uses rulePlan).
 */
export function validatePlan(raw: unknown, ctx: PlanContext): Itinerary | null {
  const r = raw as { summary?: unknown; days?: unknown } | null
  if (!r || !Array.isArray(r.days) || !r.days.length) return null
  const days = Math.max(1, Math.min(14, Math.round(ctx.days)))
  const allowed = ctx.destinations.length ? ctx.destinations : [...new Set(ctx.quests.map((q) => q.destination))]
  const questIds = new Set(ctx.quests.map((q) => q.id))
  const vendorIds = new Set(ctx.vendors.map((v) => v.id))
  const used = new Set<string>()
  const out: ItineraryDay[] = []

  for (let i = 0; i < days; i++) {
    const d = (r.days[i] ?? {}) as Record<string, unknown>
    const dest = typeof d.destination === 'string' && allowed.includes(d.destination) ? d.destination : allowed[i % allowed.length]
    const qs = uniq((Array.isArray(d.quest_ids) ? d.quest_ids : []).filter((x): x is string => typeof x === 'string' && questIds.has(x) && !used.has(x))).slice(0, MAX_QUESTS_PER_DAY)
    qs.forEach((q) => used.add(q))
    const vs = uniq((Array.isArray(d.vendor_ids) ? d.vendor_ids : []).filter((x): x is string => typeof x === 'string' && vendorIds.has(x))).slice(0, MAX_VENDORS_PER_DAY + 1)
    out.push({
      day: i + 1,
      destination: dest,
      theme: sanitizeNote(d.theme, 70) || (qs.length ? T.dayTheme(ctx.lang, i + 1, dest) : T.freeTheme(ctx.lang, i + 1, dest)),
      questIds: qs,
      vendorIds: vs,
      note: sanitizeNote(d.note, 160),
    })
  }
  if (!out.some((d) => d.questIds.length)) return null
  return {
    source: 'ai',
    createdAt: new Date().toISOString(),
    tripDays: days,
    destinations: allowed,
    summary: sanitizeNote(r.summary, 200) || T.summary(ctx.lang, days, allowed),
    days: out,
  }
}

/** One short line per day for Meilu's prompt, e.g. "Day 1 Can Tho: Explore a traditional market, ...". */
export function planSummary(it: Itinerary | null | undefined, quests: { id: string; title: string }[], max = 500): string {
  if (!it) return ''
  const title = (id: string) => quests.find((q) => q.id === id)?.title ?? id
  return it.days
    .map((d) => `Day ${d.day} ${d.destination}: ${d.questIds.map(title).join(', ') || 'free time'}`)
    .join(' | ')
    .slice(0, max)
}
