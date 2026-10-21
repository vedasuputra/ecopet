import { authedUser, getJsonRows, loadQuests, rest, rpc, supabaseConfigured } from './_supabase.js'
import type { Req, Res } from './_gemini.js'

// Admin tools for the quest-photo review queue. Only accounts whose role is 'admin' (set in
// Supabase -> Table Editor -> accounts) can use it. Photos are only readable here, never by the app.
//   queue    photos waiting for a person (oldest first), with what the AI saw
//   attempts the latest 100 checks + 7-day statistics (to tune the confidence thresholds)
//   decide   approve (the traveler is paid) or reject (they can try again)
//   referrals  who invited whom (and the bonus coins paid)
//   impact     what travelers did for sustainability and where they went, added up for all travelers
//   tickets / resolve_ticket   the customer service reports: coins back, more days on the coupon, or just an answer

const REVIEW_EXPIRES_DAYS = 14 // a photo nobody reviewed is rejected and deleted after this long
const LOG_KEEP_DAYS = 90

interface Attempt {
  id: number
  user_id: string
  quest_id: string
  outcome: string
  reason: string
  confidence: number | null
  red_flags: string[]
  ai_reason: string | null
  distance_m: number | null
  review_image: string | null
  review_status: string | null
  reported_by_user?: boolean | null
  user_note?: string | null
  created_at: string
}

const fail = (res: Res, code: number, error: string) => res.status(code).json({ ok: false, error })
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed')
  if (!supabaseConfigured()) return fail(res, 500, 'not_configured')
  const user = await authedUser(req)
  if (!user) return fail(res, 401, 'unauthorized')

  const acct = (await getJsonRows<{ role: string }>(`accounts?id=eq.${user.id}&select=role`))[0]
  if (acct?.role !== 'admin') return fail(res, 403, 'not_admin')

  const { action, id, decision, note, resolution } = req.body ?? {}
  const quests = await loadQuests()

  if (action === 'queue') {
    // housekeeping: expire old pending photos (and delete them), and old log lines
    await rest(`verification_attempts?review_status=eq.pending&created_at=lt.${encodeURIComponent(daysAgo(REVIEW_EXPIRES_DAYS))}`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status: 'rejected', review_note: 'Expired without a review', review_image: null, reviewed_at: new Date().toISOString() }),
    })
    await rest(`verification_attempts?created_at=lt.${encodeURIComponent(daysAgo(LOG_KEEP_DAYS))}`, { method: 'DELETE' })

    const items = await getJsonRows<Attempt>(
      // select=* so it also works before report_schema.sql has been run
      'verification_attempts?review_status=eq.pending&select=*&order=created_at.asc&limit=20',
    )
    return res.json({
      ok: true,
      items: items.map((a) => ({ ...a, quest: quests.find((q) => q.id === a.quest_id) ?? null })),
    })
  }

  if (action === 'attempts') {
    const rows = await getJsonRows<Attempt>(
      'verification_attempts?select=id,user_id,quest_id,outcome,reason,confidence,red_flags,ai_reason,distance_m,review_status,created_at&order=created_at.desc&limit=100',
    )
    const week = await getJsonRows<{ outcome: string; reason: string; confidence: number | null }>(
      `verification_attempts?created_at=gte.${encodeURIComponent(daysAgo(7))}&select=outcome,reason,confidence&limit=5000`,
    )
    const by: Record<string, { n: number; confidence: number[] }> = {}
    const reasons: Record<string, number> = {}
    for (const a of week) {
      by[a.outcome] ??= { n: 0, confidence: [] }
      by[a.outcome].n++
      if (a.confidence != null) by[a.outcome].confidence.push(a.confidence)
      reasons[a.reason] = (reasons[a.reason] ?? 0) + 1
    }
    const stats = Object.fromEntries(
      Object.entries(by).map(([k, v]) => [k, { n: v.n, avgConfidence: v.confidence.length ? v.confidence.reduce((x, y) => x + y, 0) / v.confidence.length : null }]),
    )
    return res.json({ ok: true, items: rows, stats, reasons, total: week.length })
  }

  // every photo check ever logged (kept LOG_KEEP_DAYS days), not only the doubtful ones: filter by result and quest, 50 per page.
  // The photos themselves are never kept, except while one waits for a review.
  if (action === 'history') {
    const { outcome, questId, page } = req.body ?? {}
    const PAGE = 50
    const p = Number.isInteger(page) && page >= 0 ? page : 0
    const filters = [
      outcome === 'approved' || outcome === 'pending' ? `review_status=eq.${outcome}` : '',
      outcome === 'review_rejected' ? 'review_status=eq.rejected' : '',
      outcome === 'verified' || outcome === 'rejected' || outcome === 'review' ? `outcome=eq.${outcome}` : '',
      typeof questId === 'string' && /^[\w-]{1,40}$/.test(questId) ? `quest_id=eq.${questId}` : '',
    ].filter(Boolean)
    const r = await rest(
      `verification_attempts?select=id,user_id,quest_id,outcome,reason,confidence,red_flags,ai_reason,distance_m,review_status,review_note,reported_by_user,user_note,reviewed_at,created_at` +
        `${filters.map((f) => `&${f}`).join('')}&order=created_at.desc&offset=${p * PAGE}&limit=${PAGE}`,
      { headers: { Prefer: 'count=exact' } },
    )
    if (!r.ok) return fail(res, 500, 'db_error')
    const rows = (await r.json()) as (Attempt & { review_note: string | null; reviewed_at: string | null })[]
    const total = Number(r.headers.get('content-range')?.split('/')[1] ?? rows.length)
    const ids = [...new Set(rows.map((a) => a.user_id))]
    const profiles = ids.length ? await getJsonRows<{ id: string; state: { user?: { name?: string } } | null }>(`profiles?id=in.(${ids.join(',')})&select=id,state`) : []
    const nameOf = (id: string) => profiles.find((x) => x.id === id)?.state?.user?.name ?? ''
    return res.json({ ok: true, total, page: p, pageSize: PAGE, items: rows.map((a) => ({ ...a, traveler: nameOf(a.user_id) })) })
  }

  if (action === 'decide') {
    if (typeof id !== 'number' || (decision !== 'approve' && decision !== 'reject')) return fail(res, 400, 'bad_request')
    const row = (await getJsonRows<Attempt>(`verification_attempts?id=eq.${id}&select=id,user_id,quest_id,review_status`))[0]
    if (!row) return fail(res, 404, 'not_found')
    if (row.review_status !== 'pending') return fail(res, 409, 'already_decided')

    if (decision === 'approve') {
      const quest = quests.find((q) => q.id === row.quest_id)
      if (!quest) return fail(res, 404, 'quest_not_found')
      // idempotent: -1 just means the traveler already got this quest some other way
      const paid = await rpc('complete_quest', { p_user: row.user_id, p_quest: quest.id, p_reward: quest.rewardCoins })
      if (!paid.ok) return fail(res, 500, 'db_error')
    }

    // the photo is deleted as soon as it has been decided
    const upd = await rest(`verification_attempts?id=eq.${id}&review_status=eq.pending`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        review_status: decision === 'approve' ? 'approved' : 'rejected',
        review_note: typeof note === 'string' ? note.trim().slice(0, 200) : null,
        review_image: null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      }),
    })
    const done = upd.ok ? ((await upd.json()) as unknown[]) : []
    if (!done.length) return fail(res, 409, 'already_decided')
    return res.json({ ok: true })
  }

  if (action === 'referrals') {
    const rows = await getJsonRows<{ id: number; referrer_id: string; referred_id: string; code: string; bonus_coins: number; voucher_uid: string | null; created_at: string }>(
      'referrals?select=*&order=created_at.desc&limit=200',
    )
    const ids = [...new Set(rows.flatMap((r) => [r.referrer_id, r.referred_id]))]
    const profiles = ids.length
      ? await getJsonRows<{ id: string; state: { user?: { name?: string } } | null }>(`profiles?id=in.(${ids.join(',')})&select=id,state`)
      : []
    const nameOf = (id: string) => profiles.find((p) => p.id === id)?.state?.user?.name ?? ''
    const codes = await getJsonRows<{ user_id: string }>('referral_codes?select=user_id&limit=5000')
    const byReferrer: Record<string, number> = {}
    for (const r of rows) byReferrer[r.referrer_id] = (byReferrer[r.referrer_id] ?? 0) + 1
    const top = Object.entries(byReferrer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => ({ id, name: nameOf(id), n }))
    return res.json({
      ok: true,
      totals: { codes: codes.length, used: rows.length, bonusCoins: rows.reduce((a, r) => a + r.bonus_coins, 0), referrers: Object.keys(byReferrer).length },
      top,
      items: rows.map((r) => ({ ...r, referrer_name: nameOf(r.referrer_id), referred_name: nameOf(r.referred_id) })),
    })
  }

  if (action === 'impact') {
    const types = await getJsonRows<{ id: string; type: string; destination: string | null }>('quests?select=id,type,destination&limit=500')
    const done = await getJsonRows<{ user_id: string; quest_id: string }>('quest_progress?select=user_id,quest_id&limit=50000')
    const typeOf = (id: string) => types.find((q) => q.id === id)
    const n = (kinds: string[]) => done.filter((d) => kinds.includes(typeOf(d.quest_id)?.type ?? '')).length
    const used = await getJsonRows<{ vendor_id: string; user_id: string }>('coupons_issued?status=eq.used&select=vendor_id,user_id&limit=50000')
    const issued = await getJsonRows<{ source: string }>('coupons_issued?select=source&limit=50000')
    const profiles = await getJsonRows<{ traveler_type: string | null }>('profiles?select=traveler_type&limit=50000').catch(() => [])
    const dest: Record<string, number> = {}
    for (const d of done) {
      const place = typeOf(d.quest_id)?.destination
      if (place) dest[place] = (dest[place] ?? 0) + 1
    }
    const kinds: Record<string, number> = {}
    for (const d of done) {
      const k = typeOf(d.quest_id)?.type ?? 'other'
      kinds[k] = (kinds[k] ?? 0) + 1
    }
    return res.json({
      ok: true,
      travelers: new Set(done.map((d) => d.user_id)).size,
      questsDone: done.length,
      busRides: n(['bus']),
      plasticFree: n(['reusable_bottle', 'reusable_utensils']),
      localQuests: n(['floating_market', 'traditional_market', 'local_goods', 'craft', 'orchard', 'local_food', 'flowers']),
      outdoor: n(['hiking', 'rowing', 'cycling']),
      couponsRedeemed: used.length,
      localShopsReached: new Set(used.map((u) => u.vendor_id)).size,
      couponsBySource: issued.reduce<Record<string, number>>((m, r) => ({ ...m, [r.source]: (m[r.source] ?? 0) + 1 }), {}),
      origin: profiles.reduce<Record<string, number>>((m, p) => ({ ...m, [p.traveler_type ?? 'unknown']: (m[p.traveler_type ?? 'unknown'] ?? 0) + 1 }), {}),
      destinations: Object.entries(dest).sort((a, b) => b[1] - a[1]),
      kinds: Object.entries(kinds).sort((a, b) => b[1] - a[1]),
    })
  }

  if (action === 'tickets') {
    const items = await getJsonRows<{ user_id: string; coupon_uid: string | null; coupon_id: string | null; vendor_id: string | null }>(
      'support_tickets?select=*&order=status.asc,created_at.asc&limit=60',
    )
    // what the team needs to decide: the coupon (still unused? bought with coins? how many?) and the shop
    const out = await Promise.all(
      items.map(async (t) => {
        const issued = t.coupon_uid ? (await getJsonRows<{ status: string; source: string; expires_at: string | null }>(`coupons_issued?uid=eq.${encodeURIComponent(t.coupon_uid)}&select=status,source,expires_at`))[0] : undefined
        const offer = t.coupon_id ? (await getJsonRows<{ title_en: string; cost_coins: number }>(`coupon_offers?id=eq.${encodeURIComponent(t.coupon_id)}&select=title_en,cost_coins`))[0] : undefined
        const vendor = t.vendor_id ? (await getJsonRows<{ name: string; plan_paid_until: string | null }>(`vendors?id=eq.${encodeURIComponent(t.vendor_id)}&select=name,plan_paid_until`))[0] : undefined
        return { ...t, coupon: issued ?? null, offer: offer ?? null, vendor: vendor ?? null }
      }),
    )
    return res.json({ ok: true, items: out })
  }

  if (action === 'resolve_ticket') {
    if (typeof id !== 'number' || (resolution !== 'refund' && resolution !== 'extend' && resolution !== 'none')) return fail(res, 400, 'bad_request')
    const r = await rpc('resolve_support_ticket', { p_ticket: id, p_admin: user.id, p_resolution: resolution, p_note: typeof note === 'string' ? note.trim().slice(0, 300) : '' })
    if (!r.ok) {
      if (r.error === 'not_open') return fail(res, 409, 'already_decided')
      if (r.error === 'not_refundable' || r.error === 'no_coupon') return fail(res, 409, r.error)
      return fail(res, 500, 'db_error')
    }
    return res.json({ ok: true, refunded: r.data })
  }

  return fail(res, 400, 'unknown_action')
}
