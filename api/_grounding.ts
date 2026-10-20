import { quests as staticQuests } from '../src/data/quests.js'
import { vendors as staticVendors } from '../src/data/vendors.js'
import { coupons as staticCoupons } from '../src/data/coupons.js'
import { haversine } from '../src/lib/geo.js'
import type { PlanQuest, PlanVendor } from '../src/lib/planner.js'
import { rest } from './_supabase.js'

// The curated facts Meilu and the itinerary planner are allowed to rely on: partner vendors, their
// coupons and the quests, all read from the database (built-in demo data only as a fallback).
// Anything not in here is something the AI must not state as fact.

export interface Offer {
  vendorId: string
  title: string
  pct: number
}
export interface GroundingCatalog {
  vendors: PlanVendor[]
  offers: Offer[]
  /** Place-specific quests only: these are what the itinerary and the "near you" list are built from. */
  quests: PlanQuest[]
  /** Quests that can be done anywhere (not part of an itinerary). */
  general: { id: string; title: string }[]
}

let cache: { at: number; data: GroundingCatalog } | null = null

const getRows = async <T>(path: string): Promise<T[] | null> => {
  try {
    const r = await rest(path)
    return r.ok ? ((await r.json()) as T[]) : null
  } catch {
    return null
  }
}

/** Vendors, active coupons and active quests; cached for a minute. */
export async function loadCatalog(): Promise<GroundingCatalog> {
  const ttl = Number(process.env.CATALOG_CACHE_MS ?? 60_000)
  if (cache && Date.now() - cache.at < ttl) return cache.data

  const [v, o, q] = await Promise.all([
    getRows<{ id: string; name: string; category_en: string; lat: number | null; lng: number | null }>('vendors?select=id,name,category_en,lat,lng'),
    getRows<{ vendor_id: string; title_en: string; discount_pct: number }>('coupon_offers?active=eq.true&select=vendor_id,title_en,discount_pct'),
    getRows<{ id: string; type: string; title_en: string; scope?: string; destination: string | null; lat: number | null; lng: number | null }>('quests?active=eq.true&select=*&order=sort'),
  ])

  const data: GroundingCatalog = {
    vendors: v
      ? v.filter((x) => x.lat != null && x.lng != null).map((x) => ({ id: x.id, name: x.name, category: x.category_en, lat: x.lat as number, lng: x.lng as number }))
      : staticVendors.map((x) => ({ id: x.id, name: x.name, category: x.category.en, lat: x.lat, lng: x.lng })),
    offers: o
      ? o.map((x) => ({ vendorId: x.vendor_id, title: x.title_en, pct: x.discount_pct }))
      : staticCoupons.filter((c) => c.active !== false).map((c) => ({ vendorId: c.vendorId, title: c.title.en, pct: c.discountPct })),
    quests: q
      ? q
          .filter((x) => x.scope !== 'general' && x.destination && x.lat != null && x.lng != null)
          .map((x) => ({ id: x.id, type: x.type, title: x.title_en, destination: x.destination as string, lat: x.lat as number, lng: x.lng as number }))
      : staticQuests.filter((x) => x.scope !== 'general').map((x) => ({ id: x.id, type: x.type, title: x.title.en, destination: x.destination, lat: x.lat, lng: x.lng })),
    general: q
      ? q.filter((x) => x.scope === 'general').map((x) => ({ id: x.id, title: x.title_en }))
      : staticQuests.filter((x) => x.scope === 'general').map((x) => ({ id: x.id, title: x.title.en })),
  }
  cache = { at: Date.now(), data }
  return data
}

/**
 * A short block of text for Meilu's prompt: the partner shops and quests near the traveler, and the
 * rules about what may NOT be stated (opening hours, prices, invented names).
 */
export function groundingText(cat: GroundingCatalog, lat: number | null, lng: number | null, maxKm = 30): string {
  const dist = (x: { lat: number; lng: number }) => (lat != null && lng != null ? haversine(lat, lng, x.lat, x.lng) : 0)
  const km = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)

  const near = cat.vendors
    .map((v) => ({ v, d: dist(v) }))
    .filter((x) => lat == null || x.d <= maxKm * 1000)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
  const shops = near.length
    ? near
        .map(({ v, d }) => {
          const offers = cat.offers.filter((o) => o.vendorId === v.id).map((o) => `${o.title} ${o.pct}% off`)
          return `- ${v.name} (${v.category})${lat != null ? `, ${km(d)} away` : ''}${offers.length ? `; coupon: ${offers.join(', ')}` : ''}`
        })
        .join('\n')
    : '- (none known near the traveler)'

  const quests = cat.quests
    .map((q) => ({ q, d: dist(q) }))
    .filter((x) => lat == null || x.d <= maxKm * 1000)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map(({ q }) => `- ${q.title} (${q.destination})`)
    .join('\n')

  return (
    `PARTNER SHOPS NEAR THE TRAVELER (these are the ONLY shops, cafes or vendors you may name):\n${shops}\n` +
    (quests ? `QUESTS NEAR THE TRAVELER:\n${quests}\n` : '') +
    (cat.general.length ? `GENERAL QUESTS (can be done anywhere, pay fewer coins):\n${cat.general.map((q) => `- ${q.title}`).join('\n')}\n` : '') +
    `FACTS POLICY: you do NOT have opening hours, prices, addresses or phone numbers, so never state them; ` +
    `say you don't have exact information and suggest checking locally. Never invent the name of a shop, restaurant, hotel or tour operator. ` +
    `For places that are not partner shops, only mention widely known landmarks or dishes, and say so if you are unsure.`
  )
}
