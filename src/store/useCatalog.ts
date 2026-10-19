import { create } from 'zustand'
import { coupons as staticCoupons, type Coupon } from '../data/coupons'
import { vendors as staticVendors, type Vendor } from '../data/vendors'
import { supabase } from '../lib/supabase'

// Vendors and the coupons they offer, loaded from the database (vendors define their own coupons).
// Starts from the built-in demo data so the app renders instantly and still works offline.
interface CatalogState {
  vendors: Vendor[]
  coupons: Coupon[] // every coupon, including paused ones (so a coupon you own always resolves)
  refresh: () => Promise<void>
}

export const useCatalog = create<CatalogState>((set) => ({
  vendors: staticVendors,
  coupons: staticCoupons,
  refresh: async () => {
    if (!supabase) return
    const [v, c] = await Promise.all([
      supabase.from('vendors').select('id,name,category_en,category_vi,lat,lng'),
      supabase.from('coupon_offers').select('id,vendor_id,title_en,title_vi,discount_pct,cost_coins,code,active'),
    ])
    if (v.error || c.error || !v.data || !c.data) return // keep what we have
    set({
      vendors: v.data
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => ({
          id: r.id,
          name: r.name,
          category: { en: r.category_en, vi: r.category_vi },
          lat: r.lat as number,
          lng: r.lng as number,
        })),
      coupons: c.data.map((r) => ({
        id: r.id,
        vendorId: r.vendor_id,
        title: { en: r.title_en, vi: r.title_vi },
        costCoins: r.cost_coins,
        discountPct: r.discount_pct,
        code: r.code,
        active: r.active,
      })),
    })
  },
}))
