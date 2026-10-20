import { haversine } from '../lib/geo'
import { PLACES } from './places'

// The area of a shop (the town it is in), used to filter coupons by where they can be redeemed. The address is read first
// ("Con Phung, Ben Tre" is in Ben Tre), then the nearest known destination within 25 km. Cai Rang belongs to Can Tho.
export const AREAS = ['Can Tho', 'Ben Tre', 'Vinh Long', 'My Tho', 'Sa Dec', 'Chau Doc', 'Tra Su'] as const

const plain = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()

export function areaOf(shop: { address?: string; lat: number; lng: number }): string | null {
  if (shop.address) {
    const a = plain(shop.address)
    const hit = AREAS.find((n) => a.includes(plain(n)))
    if (hit) return hit
  }
  let best: { name: string; d: number } | null = null
  for (const p of PLACES) {
    const d = haversine(shop.lat, shop.lng, p.lat, p.lng)
    if (d <= 25_000 && (!best || d < best.d)) best = { name: p.name === 'Cai Rang Floating Market' ? 'Can Tho' : p.name, d }
  }
  return best?.name ?? null
}
