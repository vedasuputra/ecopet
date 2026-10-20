import { PLACES } from '../data/places.js'
import { haversine } from './geo.js'
import { interestQuestTypes, questsPerDay, vendorMatches, type Interest, type TravelerStyle } from './travelerStyle.js'

// Trip planning rules shared by the app and the server: how many quests a trip gets, how quests are
// picked (the traveler's interests, then variety), the rule-based itinerary, resizing a plan when
// the stay changes, and the checks that make an AI itinerary safe (it may only use quests, vendors
// and destinations that exist in the database).

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

export const MAX_QUESTS_PER_DAY = 4 // a "packed" traveler; relaxed is 2, balanced 3 (see questsPerDay)
export const MAX_VENDORS_PER_DAY = 2
/** How far a day may reach for extra quests when its own destination has run out (a day trip). */
const TOP_UP_MAX_M = 20_000

export const clampDays = (d: number) => Math.max(1, Math.min(14, Math.round(d)))

/** A longer stay gets more active quests: 1 day = 3, 2 days = 4, ... up to 8. */
export const slotsForDays = (days: number) => Math.min(8, 2 + Math.max(1, Math.round(days)))

const coordsOf = (dest: string) => PLACES.find((p) => p.name === dest)

/**
 * Picks `count` quests from `pool`, one at a time, always preferring a quest TYPE and a DESTINATION
 * that `have` (and the earlier picks) do not cover yet. `bonus` adds to a quest's score (used to
 * favour the traveler's interests). Ties keep the original (database) order.
 */
export function pickByVariety<T extends { type: string; destination: string }>(
  pool: T[],
  count: number,
  have: { type: string; destination: string }[] = [],
  bonus?: (q: T) => number,
): T[] {
  const types = new Set(have.map((q) => q.type))
  const dests = new Set(have.map((q) => q.destination))
  const left = [...pool]
  const chosen: T[] = []
  while (chosen.length < count && left.length) {
    let best = 0
    let bestScore = -1
    left.forEach((q, i) => {
      const score = (types.has(q.type) ? 0 : 2) + (dests.has(q.destination) ? 0 : 1) + (bonus ? bonus(q) : 0)
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

/** The vendors closest to a destination (within maxKm); ones that fit the traveler's interests come first. */
export function nearestVendors(dest: string, vendors: PlanVendor[], n = MAX_VENDORS_PER_DAY, maxKm = 20, interests: Interest[] = []): PlanVendor[] {
  const c = coordsOf(dest)
  if (!c) return []
  return vendors
    .map((v) => ({ v, d: haversine(c.lat, c.lng, v.lat, v.lng), fit: interests.length && vendorMatches(v.category, interests) ? 0 : 1 }))
    .filter((x) => x.d <= maxKm * 1000)
    .sort((a, b) => a.fit - b.fit || a.d - b.d)
    .slice(0, n)
    .map((x) => x.v)
}

const T = {
  dayTheme: (_lang: string, _n: number, dest: string) => dest,
  freeTheme: (lang: string, _n: number, dest: string) => (lang === 'vi' ? `Tự do khám phá ${dest}` : `Free time in ${dest}`),
  summary: (lang: string, days: number, dests: string[]) =>
    lang === 'vi' ? `Kế hoạch ${days} ngày: ${dests.join(', ')}` : `${days}-day plan: ${dests.join(', ')}`,
}

export interface PlanContext {
  days: number
  destinations: string[]
  quests: PlanQuest[]
  vendors: PlanVendor[]
  lang: string
  /** What kind of traveler this is (optional): sets the quests per day and which quests/shops are favoured. */
  style?: TravelerStyle | null
}

/** One day of the rule-based plan; the quests it takes are added to `used`. */
function buildDay(ctx: PlanContext, index: number, dest: string, used: Set<string>): ItineraryDay {
  const perDay = questsPerDay(ctx.style)
  const liked = interestQuestTypes(ctx.style?.interests ?? [])
  const bonus = liked.size ? (q: { type: string }) => (liked.has(q.type) ? 2 : 0) : undefined

  let chosen = pickByVariety(ctx.quests.filter((q) => q.destination === dest && !used.has(q.id)), perDay, [], bonus)
  const minimum = Math.min(2, perDay)
  if (chosen.length < minimum) {
    // not enough quests in this destination: top up with the closest unused ones elsewhere, but only within
    // a day trip (a "Can Tho" day may borrow a Cai Rang quest, never one in Chau Doc 200 km away)
    const c = coordsOf(dest)
    const extra = ctx.quests
      .filter((q) => !used.has(q.id) && !chosen.some((x) => x.id === q.id))
      .filter((q) => !c || haversine(c.lat, c.lng, q.lat, q.lng) <= TOP_UP_MAX_M)
      .sort((a, b) => (c ? haversine(c.lat, c.lng, a.lat, a.lng) - haversine(c.lat, c.lng, b.lat, b.lng) : 0))
    chosen = [...chosen, ...pickByVariety(extra, minimum - chosen.length, chosen, bonus)]
  }
  chosen.forEach((q) => used.add(q.id))
  return {
    day: index + 1,
    destination: dest,
    theme: chosen.length ? T.dayTheme(ctx.lang, index + 1, dest) : T.freeTheme(ctx.lang, index + 1, dest),
    questIds: chosen.map((q) => q.id),
    vendorIds: nearestVendors(dest, ctx.vendors, MAX_VENDORS_PER_DAY, 20, ctx.style?.interests ?? []).map((v) => v.id),
    note: '',
  }
}

/** The plan without AI: destinations in turn, a day's worth of varied quests (fitted to the traveler), the closest partner shops. */
export function rulePlan(ctx: PlanContext, fallback = 'chosen'): Itinerary {
  const days = clampDays(ctx.days)
  const known = [...new Set(ctx.quests.map((q) => q.destination))]
  const dests = ctx.destinations.length ? ctx.destinations : known
  const used = new Set<string>()
  const out: ItineraryDay[] = []
  for (let i = 0; i < days; i++) out.push(buildDay(ctx, i, dests[i % dests.length], used))
  return { source: 'rules', createdAt: new Date().toISOString(), tripDays: days, destinations: dests, summary: T.summary(ctx.lang, days, dests), days: out, fallback }
}

/**
 * The traveler changed how long they stay. Keeps every day they already have (including hand edits):
 * a shorter stay drops the last days, a longer one adds days built from the rules out of the quests
 * that are not used yet. The old summary is replaced because it may name the old number of days.
 */
/** A plan with every day empty (no place, no quests, no shops): "simple rules" means the traveler fills it in by hand. */
export function emptyPlan(tripDays: number, destinations: string[]): Itinerary {
  const n = clampDays(tripDays)
  return {
    source: 'rules',
    createdAt: new Date().toISOString(),
    tripDays: n,
    destinations,
    summary: '',
    days: Array.from({ length: n }, (_, i) => ({ day: i + 1, destination: '', theme: '', questIds: [], vendorIds: [], note: '' })),
    fallback: 'chosen',
  }
}

export function resizeItinerary(it: Itinerary, newDays: number, ctx: Omit<PlanContext, 'days' | 'destinations'>): Itinerary {
  const n = clampDays(newDays)
  if (n === it.tripDays) return it
  const days = it.days.slice(0, n).map((d) => ({ ...d, questIds: [...d.questIds], vendorIds: [...d.vendorIds] }))
  if (n > days.length) {
    const used = new Set(days.flatMap((d) => d.questIds))
    const full: PlanContext = { ...ctx, days: n, destinations: it.destinations }
    for (let i = days.length; i < n; i++) days.push(buildDay(full, i, it.destinations[i % it.destinations.length], used))
  }
  return { ...it, tripDays: n, days, summary: T.summary(ctx.lang, n, it.destinations) }
}

/**
 * Free text written by an AI is the only part of a plan that is not checked against the database,
 * so facts that tend to be invented (opening hours, prices, phone numbers, links) are removed.
 * Returns '' when the text looks like it states one.
 */
/** The day number is shown by the page, so a theme never starts with "Day 1:" / "Ngày 1:" (older plans and AI text sometimes do). */
export const stripDayPrefix = (theme: string) => theme.replace(/^\s*(day|ngày)\s*\d+\s*[:\-–]\s*/i, '').trim()

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
 * there are exactly `days` days, a day holds no more quests than the traveler's pace allows,
 * and free text has been stripped of invented facts.
 * Returns null when nothing usable is left (the caller then uses rulePlan).
 */
export function validatePlan(raw: unknown, ctx: PlanContext): Itinerary | null {
  const r = raw as { summary?: unknown; days?: unknown } | null
  if (!r || !Array.isArray(r.days) || !r.days.length) return null
  const days = clampDays(ctx.days)
  const perDay = questsPerDay(ctx.style)
  const allowed = ctx.destinations.length ? ctx.destinations : [...new Set(ctx.quests.map((q) => q.destination))]
  const questIds = new Set(ctx.quests.map((q) => q.id))
  const vendorIds = new Set(ctx.vendors.map((v) => v.id))
  const used = new Set<string>()
  const out: ItineraryDay[] = []

  for (let i = 0; i < days; i++) {
    const d = (r.days[i] ?? {}) as Record<string, unknown>
    const dest = typeof d.destination === 'string' && allowed.includes(d.destination) ? d.destination : allowed[i % allowed.length]
    const qs = uniq((Array.isArray(d.quest_ids) ? d.quest_ids : []).filter((x): x is string => typeof x === 'string' && questIds.has(x) && !used.has(x))).slice(0, perDay)
    qs.forEach((q) => used.add(q))
    const vs = uniq((Array.isArray(d.vendor_ids) ? d.vendor_ids : []).filter((x): x is string => typeof x === 'string' && vendorIds.has(x))).slice(0, MAX_VENDORS_PER_DAY + 1)
    out.push({
      day: i + 1,
      destination: dest,
      // the title of a day is always the same as in a plan made with simple rules (the place, or free time there): the AI's own words are not used
      theme: qs.length ? T.dayTheme(ctx.lang, i + 1, dest) : T.freeTheme(ctx.lang, i + 1, dest),
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
