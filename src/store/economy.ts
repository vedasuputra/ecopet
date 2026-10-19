import { translate, useLang } from '../i18n'
import { economyApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAppStore, vnDay } from './useAppStore'
import { useCelebration } from './useCelebration'

// The traveler's coins, completed quests, coupons and welcome gift live on the server.
// refreshEconomy() mirrors them into the app (read-only, via row-level security); every change goes
// through /api/economy (or /api/verify, /api/vendor), which validate it and apply it atomically.

let inFlight: Promise<void> | null = null

export function refreshEconomy(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    if (!supabase) return
    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user.id
    if (!uid) return

    const [wallet, quests, coupons, ads] = await Promise.all([
      supabase.from('wallets').select('coins,welcome_claimed').eq('user_id', uid).maybeSingle(),
      supabase.from('quest_progress').select('quest_id').eq('user_id', uid),
      supabase.from('coupons_issued').select('uid,coupon_id,status').eq('user_id', uid).order('issued_at', { ascending: true }),
      supabase.from('coin_ledger').select('created_at').eq('user_id', uid).eq('reason', 'ad').order('created_at', { ascending: false }).limit(10),
    ])
    // on any error keep what we have rather than flashing zeros
    if (wallet.error || quests.error || coupons.error || ads.error) return

    const today = vnDay(new Date())
    const next = (coupons.data ?? []).map((r) => ({
      uid: r.uid as string,
      couponId: r.coupon_id as string,
      status: r.status as 'unused' | 'used',
    }))
    const prev = useAppStore.getState().ownedCoupons
    // a vendor just scanned one of my coupons -> celebrate
    const newlyUsed = next.some((n) => n.status === 'used' && prev.find((p) => p.uid === n.uid)?.status === 'unused')

    useAppStore.getState().setEconomy({
      coins: wallet.data?.coins ?? 0,
      welcomeGiftClaimed: wallet.data?.welcome_claimed ?? false,
      questStatus: Object.fromEntries((quests.data ?? []).map((r) => [r.quest_id as string, 'done' as const])),
      ownedCoupons: next,
      adWatch: { date: today, count: (ads.data ?? []).filter((r) => vnDay(new Date(r.created_at as string)) === today).length },
    })
    if (newlyUsed) useCelebration.getState().show(translate(useLang.getState().lang, 'celebrateCoupon'))
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

export type ActionResult = { ok: true; couponId?: string } | { ok: false; error: string }

async function run(action: string, extra: Record<string, unknown> = {}) {
  const r = await economyApi(action, extra)
  if (r.ok) await refreshEconomy()
  return r
}

/** Rewarded-ad coins (+5, at most 3 a day: enforced by the server). */
export async function claimAd(): Promise<ActionResult> {
  const r = await run('ad_reward')
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'error' }
}

/** Trade coins for a coupon. The server checks the price and the balance. */
export async function buyCoupon(couponId: string): Promise<ActionResult> {
  const r = await run('buy_coupon', { couponId })
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'error' }
}

/** The new-user gift: the server draws the winning coupon and issues it once per account. */
export async function claimWelcome(): Promise<ActionResult> {
  const r = await run('welcome_gift')
  return r.ok ? { ok: true, couponId: String(r.couponId) } : { ok: false, error: r.error ?? 'error' }
}

/** Dev tools (demo accounts, or any account when the server sets ALLOW_DEV_ECONOMY=1). */
export async function devAction(action: 'dev_grant' | 'dev_reset' | 'dev_demo', extra: Record<string, unknown> = {}): Promise<ActionResult> {
  const r = await run(action, extra)
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'error' }
}
