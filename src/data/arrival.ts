import type { Coupon } from './coupons'
import { PLACES } from './places'
import type { Vendor } from './vendors'
import { haversine } from '../lib/geo'

// Where Meilu says hello (the arrival toast): around each destination, and right at a partner shop with coupons. Shared by the toast,
// the map of the chat and the maps of the location popup, so the dots there are exactly the spots that get a message.
export const AT_SHOP_M = 120

// the colours of the dots on the maps: a place (with its area), a partner shop with coupons, a quest spot
export const PLACE_COLOR = '#168fd6'
export const SHOP_COLOR = '#1b7a43'
export const QUEST_COLOR = '#f2a900'

// a town is a wide area; a single sight (the floating market, the forest) is small
const TOWN_M = 3000
const SIGHT_M = 1500
const SIGHTS = new Set(['Cai Rang Floating Market', 'Tra Su'])

export const ARRIVAL_SPOTS = PLACES.map((p) => ({ ...p, radiusM: SIGHTS.has(p.name) ? SIGHT_M : TOWN_M }))
export type ArrivalSpot = (typeof ARRIVAL_SPOTS)[number]

/** The partner shops that have a coupon to use: the only shops that get a hello. */
export const shopsWithCoupons = (vendors: Vendor[], coupons: Coupon[]) =>
  vendors.filter((v) => coupons.some((c) => c.vendorId === v.id && c.active !== false))

/** Where the traveler is: right at a partner shop with coupons, or else inside the area of a destination, or nowhere the app knows. */
export function whereAt(lat: number, lng: number, vendors: Vendor[], coupons: Coupon[]): { kind: 'shop'; shop: Vendor } | { kind: 'place'; spot: ArrivalSpot } | null {
  const shop = shopsWithCoupons(vendors, coupons).find((v) => haversine(lat, lng, v.lat, v.lng) <= AT_SHOP_M)
  if (shop) return { kind: 'shop', shop }
  const spot = ARRIVAL_SPOTS.find((p) => haversine(lat, lng, p.lat, p.lng) <= p.radiusM)
  return spot ? { kind: 'place', spot } : null
}
