import { recordIssued } from '../lib/couponLedger'
import { supabase } from '../lib/supabase'
import { useAppStore } from './useAppStore'

// Keeps the zustand store and public.profiles.state in sync for the signed-in user.
// localStorage (zustand persist) stays as an offline cache.

const pick = (s: ReturnType<typeof useAppStore.getState>) => ({
  user: s.user,
  coins: s.coins,
  activeQuestIds: s.activeQuestIds,
  questStatus: s.questStatus,
  ownedCoupons: s.ownedCoupons,
  chatHistory: s.chatHistory,
  adWatch: s.adWatch,
  commissionEvents: s.commissionEvents,
  welcomeGiftClaimed: s.welcomeGiftClaimed,
})

let timer: ReturnType<typeof setTimeout> | undefined
let unsub: (() => void) | undefined
let applying = false

/** Loads this user's saved state into the store. Returns true if a saved profile existed. */
export async function loadRemote(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.from('profiles').select('state').eq('id', userId).maybeSingle()
  if (error || !data || !data.state || !Object.keys(data.state).length) return false
  applying = true
  useAppStore.setState(data.state)
  applying = false
  return true
}

async function push(userId: string) {
  if (!supabase) return
  await supabase.from('profiles').upsert({ id: userId, state: pick(useAppStore.getState()), updated_at: new Date().toISOString() })
}

/** Saves every store change (debounced) until stopSync(). */
export function startSync(userId: string) {
  stopSync()
  void push(userId)
  unsub = useAppStore.subscribe(() => {
    if (applying) return
    clearTimeout(timer)
    timer = setTimeout(() => void push(userId), 800)
  })
}

export function stopSync() {
  clearTimeout(timer)
  unsub?.()
  unsub = undefined
}

/**
 * Keeps this traveler's coupons in step with the shared ledger:
 *  - backfills coupons the ledger doesn't know yet (so a vendor can scan them)
 *  - applies redemptions a vendor made, which marks the coupon used, completes the
 *    "redeem a coupon" quest and pays the bonus coins (all done by useCoupon)
 */
export async function syncCouponLedger(): Promise<void> {
  if (!supabase) return
  const { data: sess } = await supabase.auth.getSession()
  const user = sess.session?.user
  if (!user) return

  const { data: rows, error } = await supabase.from('coupons_issued').select('uid,status').eq('user_id', user.id)
  if (error || !rows) return
  const remote = new Map(rows.map((r) => [r.uid as string, r.status as string]))

  for (const oc of useAppStore.getState().ownedCoupons) {
    if (oc.status === 'unused' && !remote.has(oc.uid)) {
      await recordIssued(oc.uid, oc.couponId, oc.uid.includes('-welcome-') ? 'welcome' : 'coins')
    } else if (oc.status === 'unused' && remote.get(oc.uid) === 'used') {
      useAppStore.getState().useCoupon(oc.uid)
    }
  }
}
