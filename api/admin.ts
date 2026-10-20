import { authedUser, getJsonRows, loadQuests, rest, rpc, supabaseConfigured } from './_supabase.js'
import type { Req, Res } from './_gemini.js'

// Admin tools for the quest-photo review queue. Only accounts whose role is 'admin' (set in
// Supabase -> Table Editor -> accounts) can use it. Photos are only readable here, never by the app.
//   queue    photos waiting for a person (oldest first), with what the AI saw
//   attempts the latest 100 checks + 7-day statistics (to tune the confidence thresholds)
//   decide   approve (the traveler is paid) or reject (they can try again)

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

  const { action, id, decision, note } = req.body ?? {}
  const quests = await loadQuests()

  if (action === 'queue') {
    // housekeeping: expire old pending photos (and delete them), and old log lines
    await rest(`verification_attempts?review_status=eq.pending&created_at=lt.${encodeURIComponent(daysAgo(REVIEW_EXPIRES_DAYS))}`, {
      method: 'PATCH',
      body: JSON.stringify({ review_status: 'rejected', review_note: 'Expired without a review', review_image: null, reviewed_at: new Date().toISOString() }),
    })
    await rest(`verification_attempts?created_at=lt.${encodeURIComponent(daysAgo(LOG_KEEP_DAYS))}`, { method: 'DELETE' })

    const items = await getJsonRows<Attempt>(
      'verification_attempts?review_status=eq.pending&select=id,user_id,quest_id,outcome,reason,confidence,red_flags,ai_reason,distance_m,review_image,created_at&order=created_at.asc&limit=20',
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

  return fail(res, 400, 'unknown_action')
}
