import { coupons } from '../data/coupons'
import { supabase } from './supabase'

/**
 * Records a coupon a traveler just obtained in the shared ledger (public.coupons_issued), so the
 * vendor can see it and scan it. Safe to call twice: duplicates are ignored. No-op when signed out.
 */
export async function recordIssued(uid: string, couponId: string, source: 'coins' | 'welcome'): Promise<void> {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  const coupon = coupons.find((c) => c.id === couponId)
  if (!user || !coupon) return
  const { error } = await supabase.from('coupons_issued').upsert(
    {
      uid,
      user_id: user.id,
      coupon_id: couponId,
      vendor_id: coupon.vendorId,
      discount_pct: coupon.discountPct,
      source,
    },
    { onConflict: 'uid', ignoreDuplicates: true },
  )
  if (error) console.error('coupons_issued insert failed', error.message)
}
