import { DEMO_ECONOMY } from '../src/data/demoState.js'
import { authedUser, deleteAuthUser, getJsonRows, loadQuests, rest, rpc, supabaseConfigured } from './_supabase.js'
import type { Req, Res } from './_gemini.js'

// The only way coins, the welcome gift and coupon purchases change. Every action is authenticated
// with the caller's Supabase token and applied by an atomic SQL function with the service_role key:
// the browser can ask, but it can never set a balance, a price or a reward itself.

const AD_REWARD = 5
const AD_DAILY_LIMIT = 3

const fail = (res: Res, code: number, error: string) => res.status(code).json({ ok: false, error })

/** Dev tools: demo accounts always, anyone else only when ALLOW_DEV_ECONOMY=1 is set on the server. */
const devAllowed = (email: string) => email.endsWith('@ecopet.demo') || process.env.ALLOW_DEV_ECONOMY === '1'

async function wipeUser(userId: string) {
  // coupons first (no FK order issues, but keeps it explicit), then the economy rows
  for (const table of ['coupons_issued', 'coin_ledger', 'quest_progress', 'wallets']) {
    await rest(`${table}?user_id=eq.${userId}`, { method: 'DELETE' })
  }
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed')
  if (!supabaseConfigured()) return fail(res, 500, 'not_configured')
  const user = await authedUser(req)
  if (!user) return fail(res, 401, 'unauthorized')

  const { action, couponId, amount } = req.body ?? {}

  // Right to erasure: a traveler deletes their own account and everything tied to it.
  if (action === 'delete_account') {
    const acct = (await getJsonRows<{ role: string }>(`accounts?id=eq.${user.id}&select=role`))[0]
    if (acct?.role === 'vendor') return fail(res, 403, 'vendor_account') // shop accounts: on request, so the listing is handled properly
    return (await deleteAuthUser(user.id)) ? res.json({ ok: true }) : fail(res, 500, 'db_error')
  }

  if (action === 'ad_reward') {
    const r = await rpc('claim_ad_reward', { p_user: user.id, p_amount: AD_REWARD, p_limit: AD_DAILY_LIMIT })
    if (!r.ok) return fail(res, 500, 'db_error')
    if (r.data === -2) return fail(res, 429, 'daily_limit')
    return res.json({ ok: true, coins: r.data })
  }

  if (action === 'buy_coupon') {
    if (typeof couponId !== 'string') return fail(res, 400, 'bad_request')
    const uid = `${couponId}-${Date.now()}`
    const r = await rpc('buy_coupon', { p_user: user.id, p_coupon: couponId, p_uid: uid })
    if (!r.ok) {
      if (r.error === 'insufficient_coins') return fail(res, 402, 'insufficient_coins')
      if (r.error === 'coupon_unavailable') return fail(res, 404, 'coupon_unavailable')
      if (r.error === 'sold_out') return fail(res, 409, 'sold_out')
      if (r.error === 'daily_coupon_limit') return fail(res, 429, 'daily_coupon_limit')
      return fail(res, 500, 'db_error')
    }
    return res.json({ ok: true, coins: r.data, uid })
  }

  if (action === 'welcome_gift') {
    const r = await rpc('claim_welcome', { p_user: user.id, p_uid: `w-${Date.now()}` })
    if (!r.ok) {
      if (r.error === 'already_claimed') return fail(res, 409, 'already_claimed')
      return fail(res, 500, r.error === 'no_coupons' ? 'no_coupons' : 'db_error')
    }
    return res.json({ ok: true, couponId: r.data })
  }

  // ---- dev tools (demo/testing only)
  if (action === 'dev_grant' || action === 'dev_reset' || action === 'dev_demo') {
    if (!devAllowed(user.email)) return fail(res, 403, 'dev_disabled')

    if (action === 'dev_grant') {
      const n = Math.round(Number(amount))
      if (!Number.isFinite(n) || n < 1 || n > 1000) return fail(res, 400, 'bad_request')
      const r = await rpc('apply_coins', { p_user: user.id, p_delta: n, p_reason: 'dev', p_ref: `${Date.now()}-${Math.random()}` })
      return r.ok ? res.json({ ok: true, coins: r.data }) : fail(res, 500, 'db_error')
    }

    await wipeUser(user.id)
    if (action === 'dev_reset') return res.json({ ok: true })

    // dev_demo: the demo traveler's economy
    for (const id of DEMO_ECONOMY.questsDone) {
      const q = (await loadQuests()).find((x) => x.id === id)
      if (q) await rpc('complete_quest', { p_user: user.id, p_quest: id, p_reward: q.rewardCoins })
    }
    const bal = await rpc('apply_coins', { p_user: user.id, p_delta: 0, p_reason: 'seed', p_ref: 'probe' })
    const have = bal.ok && typeof bal.data === 'number' ? bal.data : 0
    if (DEMO_ECONOMY.coins > have) {
      await rpc('apply_coins', { p_user: user.id, p_delta: DEMO_ECONOMY.coins - have, p_reason: 'seed', p_ref: 'demo' })
    }
    await rest('wallets?user_id=eq.' + user.id, { method: 'PATCH', body: JSON.stringify({ welcome_claimed: true }) })
    const offer = await rest(`coupon_offers?id=eq.${DEMO_ECONOMY.couponId}&select=id,vendor_id,discount_pct`)
    const o = offer.ok ? ((await offer.json()) as { id: string; vendor_id: string; discount_pct: number }[])[0] : undefined
    if (o) {
      await rest('coupons_issued', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          uid: `${o.id}-demo-${String(Date.now()).slice(-4)}`,
          user_id: user.id,
          coupon_id: o.id,
          vendor_id: o.vendor_id,
          discount_pct: o.discount_pct,
          source: 'coins',
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        }),
      })
    }
    return res.json({ ok: true })
  }

  return fail(res, 400, 'unknown_action')
}
