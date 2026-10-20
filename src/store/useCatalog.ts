import { create } from 'zustand'
import { coupons as staticCoupons, type Coupon } from '../data/coupons'
import { quests as staticQuests, type Quest, type QuestType } from '../data/quests'
import { vendors as staticVendors, type Vendor } from '../data/vendors'
import type { OpenHours } from '../lib/openHours'
import { supabase } from '../lib/supabase'

// Everything that is defined in the database rather than in code: the vendors, the coupons they
// offer (with validity and monthly limits) and the quests. Starts from the built-in demo data so the
// app renders instantly and still works offline; each part is replaced as soon as it loads.
interface CatalogState {
  vendors: Vendor[]
  coupons: Coupon[] // every coupon, including paused ones (so a coupon you own always resolves)
  quests: Quest[] // active quests only
  refresh: () => Promise<void>
}

export const useCatalog = create<CatalogState>((set) => ({
  vendors: staticVendors,
  coupons: staticCoupons,
  quests: staticQuests,
  refresh: async () => {
    if (!supabase) return
    // A database that has not had the newest SQL files yet lacks some columns, and asking for a missing column fails the whole
    // query. So the newest set of columns is tried first, then older ones, and the app keeps working with what exists.
    const tryColumns = async (table: string, sets: string[]) => {
      let last: any
      for (const cols of sets) {
        last = await supabase!.from(table).select(cols)
        if (!last.error) break
      }
      return last as { error: unknown; data: any[] | null }
    }
    const [v, c, q, u] = await Promise.all([
      tryColumns('vendors', [
        'id,name,category_en,category_vi,kind,lat,lng,address,open_hours,plan_paid_until',
        'id,name,category_en,category_vi,lat,lng,address,open_hours,plan_paid_until',
        'id,name,category_en,category_vi,lat,lng',
      ]),
      tryColumns('coupon_offers', [
        'id,vendor_id,title_en,title_vi,discount_pct,deal_type,deal_value,cost_coins,code,active,valid_days,monthly_cap',
        'id,vendor_id,title_en,title_vi,discount_pct,cost_coins,code,active,valid_days,monthly_cap',
        'id,vendor_id,title_en,title_vi,discount_pct,cost_coins,code,active',
      ]),
      supabase.from('quests').select('*').eq('active', true).order('sort'),
      supabase.from('offer_usage').select('offer_id,issued_this_month'),
    ])

    if (!v.error && v.data) {
      set({
        vendors: v.data
          // only shops with a paid-up subscription show on the map and offer coupons
          // (an old database without the plan_paid_until column shows every shop)
          .filter((r) => r.lat != null && r.lng != null && (!('plan_paid_until' in r) || (r.plan_paid_until && new Date(r.plan_paid_until) > new Date())))
          .map((r) => ({
            id: r.id,
            name: r.name,
            category: { en: r.category_en, vi: r.category_vi },
            lat: r.lat as number,
            lng: r.lng as number,
            kind: r.kind ?? undefined, // older databases have no kind column yet
            address: r.address ?? undefined,
            openHours: (r.open_hours as OpenHours | null) ?? null,
          })),
      })
    }

    if (!c.error && c.data) {
      // the usage view is optional: without it every capped coupon just shows no "left this month" count
      const used = new Map((u.data ?? []).map((r) => [r.offer_id as string, r.issued_this_month as number]))
      set({
        coupons: c.data.map((r) => ({
          id: r.id,
          vendorId: r.vendor_id,
          title: { en: r.title_en, vi: r.title_vi },
          costCoins: r.cost_coins,
          discountPct: r.discount_pct,
          dealType: r.deal_type ?? 'percent', // older databases have no deal_type column yet
          dealValue: r.deal_value ?? null,
          code: r.code,
          active: r.active,
          validDays: Math.min(7, r.valid_days ?? 7), // a coupon is valid for at most 7 days after it is bought
          monthlyCap: r.monthly_cap ?? null,
          remaining: r.monthly_cap == null ? null : Math.max(0, r.monthly_cap - (used.get(r.id) ?? 0)),
        })),
      })
    }

    if (!q.error && q.data) {
      set({
        quests: q.data.map((r) => ({
          id: r.id,
          type: r.type as QuestType,
          title: { en: r.title_en, vi: r.title_vi },
          description: { en: r.description_en, vi: r.description_vi },
          scope: r.scope === 'general' ? 'general' : 'place', // older databases have no scope column: everything is place-specific
          destination: r.destination ?? '',
          lat: r.lat ?? 0,
          lng: r.lng ?? 0,
          radiusM: r.radius_m ?? 0,
          rewardCoins: r.reward_coins,
          requiredObject: r.required_object ?? undefined,
          requiredScene: r.required_scene ?? undefined,
        })) as Quest[],
      })
    }
  },
}))
