import { translate, useLang } from '../i18n'
import { economyApi } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAppStore, vnDay, type ReviewInfo } from './useAppStore'
import { useCatalog } from './useCatalog'
import { useCelebration } from './useCelebration'

// The traveler's coins, completed quests, coupons and welcome gift live on the server.
// refreshEconomy() mirrors them into the app (read-only, via row-level security); every change goes
// through /api/economy (or /api/verify, /api/vendor), which validate it and apply it atomically.

let inFlight: Promise<void> | null = null
let loadedOnce = false // the first load must not celebrate quests that were already done

export function refreshEconomy(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    if (!supabase) return
    const { data: sess } = await supabase.auth.getSession()
    const uid = sess.session?.user.id
    if (!uid) return

    const couponCols = async () => {
      const full = await supabase!.from('coupons_issued').select('uid,coupon_id,status,expires_at,source').eq('user_id', uid).order('issued_at', { ascending: true })
      if (!full.error) return full
      // older database without the expiry column: fall back so coins and coupons keep syncing
      return supabase!.from('coupons_issued').select('uid,coupon_id,status').eq('user_id', uid).order('issued_at', { ascending: true })
    }
    const [wallet, quests, coupons, ads, attempts] = await Promise.all([
      supabase.from('wallets').select('coins,welcome_claimed').eq('user_id', uid).maybeSingle(),
      supabase.from('quest_progress').select('quest_id').eq('user_id', uid),
      couponCols(),
      supabase.from('coin_ledger').select('created_at').eq('user_id', uid).eq('reason', 'ad').order('created_at', { ascending: false }).limit(10),
      // optional: the photo-review log (an older database simply has no such table)
      supabase.from('verification_attempts').select('quest_id,outcome,review_status,review_note,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(60),
    ])
    // on any error keep what we have rather than flashing zeros
    if (wallet.error || quests.error || coupons.error || ads.error) return

    const today = vnDay(new Date())
    const next = (coupons.data ?? []).map((r) => ({
      uid: r.uid as string,
      couponId: r.coupon_id as string,
      status: r.status as 'unused' | 'used',
      expiresAt: ((r as { expires_at?: string | null }).expires_at as string | null | undefined) ?? null,
      source: (r as { source?: string }).source === 'welcome' ? ('welcome' as const) : (r as { source?: string }).source === 'referral' ? ('referral' as const) : ('coins' as const),
    }))
    const prev = useAppStore.getState().ownedCoupons
    // a vendor just scanned one of my coupons -> celebrate
    const newlyUsed = next.some((n) => n.status === 'used' && prev.find((p) => p.uid === n.uid)?.status === 'unused')

    const questStatus = Object.fromEntries((quests.data ?? []).map((r) => [r.quest_id as string, 'done' as const]))
    // newest attempt per quest: still waiting for a person, or looked at and not approved
    const reviewStatus: Record<string, ReviewInfo> = {}
    const seen = new Set<string>()
    for (const a of attempts.error ? [] : (attempts.data ?? [])) {
      const qid = a.quest_id as string
      if (seen.has(qid)) continue
      seen.add(qid)
      if (questStatus[qid]) continue
      if (a.outcome === 'review' && a.review_status === 'pending') reviewStatus[qid] = { status: 'pending' }
      else if (a.outcome === 'review' && a.review_status === 'rejected') reviewStatus[qid] = { status: 'rejected', note: a.review_note as string | null }
    }
    // a quest became done without the traveler doing anything here (a reviewer approved the photo)
    const prevQuests = useAppStore.getState().questStatus
    const newlyDone = Object.keys(questStatus).filter((id) => !(id in prevQuests))

    useAppStore.getState().setEconomy({
      coins: wallet.data?.coins ?? 0,
      welcomeGiftClaimed: wallet.data?.welcome_claimed ?? false,
      questStatus,
      reviewStatus,
      ownedCoupons: next,
      adWatch: { date: today, count: (ads.data ?? []).filter((r) => vnDay(new Date(r.created_at as string)) === today).length },
    })
    const celebrate = useCelebration.getState()
    if (loadedOnce && newlyDone.length && Date.now() - celebrate.id > 8000) {
      const reward = useCatalog.getState().quests.find((q) => q.id === newlyDone[0])?.rewardCoins ?? 0
      celebrate.show(translate(useLang.getState().lang, 'celebrateQuest', { n: reward }))
    }
    if (newlyUsed) useCelebration.getState().show(translate(useLang.getState().lang, 'celebrateCoupon'))
    loadedOnce = true
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

/** The shop stopped being a paid-up partner: give back the coins paid for an unused coupon. */
export async function refundCoupon(uid: string): Promise<ActionResult> {
  const r = await run('refund_coupon', { uid })
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

/** Your own referral code (made the first time it is asked for) and how many friends joined with it. */
export async function getReferral(): Promise<{ ok: boolean; code?: string; joined?: number; error?: string }> {
  const r = await run('my_referral')
  return r.ok ? { ok: true, code: String(r.code), joined: Number(r.joined ?? 0) } : { ok: false, error: r.error ?? 'error' }
}

/** A new traveler uses a friend's code: 20 coins for them and a new voucher for the friend. */
export async function applyReferral(code: string): Promise<ActionResult> {
  const r = await run('apply_referral', { code })
  return r.ok ? { ok: true } : { ok: false, error: r.error ?? 'error' }
}
