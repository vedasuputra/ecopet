import { createHash } from 'node:crypto'
import type { Req, Res } from './_gemini.js'
import { apiHit, authedUser, getJsonRows, rest, supabaseConfigured } from './_supabase.js'

// A traveler says "the AI got this photo wrong". The photo goes into the admin review queue (the same
// one as the AI's unsure cases), where a person looks at it and approves (pays) or rejects it.
//
// Safeguards: signed in; the attempt must be the traveler's own, rejected by the AI (not by a rule such as
// distance or a duplicate), reported at most once and only soon after; the photo sent must be exactly the
// photo that was checked (its SHA-256 must match the one logged); the quest must not be done already; and
// reports are rate limited so nobody can flood the queue.

const REPORT_WINDOW_MS = 30 * 60 * 1000
// rejections that came from the AI's look at the photo (the others are plain rules)
export const REPORTABLE_REASONS = ['not_detected', 'no_evidence', 'suspicious', 'screenshot', 'low_confidence']
const MAX_IMAGE_CHARS = 3_000_000

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
const PER_MINUTE = num(process.env.REPORT_PER_MINUTE, 3)
const PER_DAY = num(process.env.REPORT_PER_DAY, 10)
const GLOBAL_PER_DAY = num(process.env.REPORT_GLOBAL_PER_DAY, 300)

const fail = (res: Res, code: number, error: string) => res.status(code).json({ ok: false, error })

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed')
  if (!supabaseConfigured()) return fail(res, 500, 'not_configured')
  const user = await authedUser(req)
  if (!user) return fail(res, 401, 'unauthorized')

  const { attemptId, image, note } = req.body ?? {}
  if (typeof attemptId !== 'number' || !Number.isInteger(attemptId) || typeof image !== 'string' || !image || image.length > MAX_IMAGE_CHARS) {
    return fail(res, 400, 'bad_request')
  }

  const attempt = (
    await getJsonRows<{ id: number; quest_id: string; outcome: string; reason: string; photo_hash: string | null; review_status: string | null; reported_by_user: boolean | null; created_at: string }>(
      `verification_attempts?id=eq.${attemptId}&user_id=eq.${user.id}&select=id,quest_id,outcome,reason,photo_hash,review_status,reported_by_user,created_at`,
    )
  )[0]
  if (!attempt) return fail(res, 404, 'not_found')
  if (attempt.reported_by_user) return fail(res, 409, 'already_reported')
  if (attempt.outcome !== 'rejected' || attempt.review_status || !REPORTABLE_REASONS.includes(attempt.reason)) return fail(res, 409, 'not_reportable')
  if (Date.now() - Date.parse(attempt.created_at) > REPORT_WINDOW_MS) return fail(res, 409, 'too_late')

  // already paid some other way, or another photo of this quest is already waiting
  const done = await rest(`quest_progress?user_id=eq.${user.id}&quest_id=eq.${encodeURIComponent(attempt.quest_id)}&select=quest_id`)
  if (done.ok && ((await done.json()) as unknown[]).length) return fail(res, 409, 'already_done')
  const pending = await rest(`verification_attempts?user_id=eq.${user.id}&quest_id=eq.${encodeURIComponent(attempt.quest_id)}&review_status=eq.pending&select=id&limit=1`)
  if (pending.ok && ((await pending.json()) as unknown[]).length) return fail(res, 409, 'review_pending')

  // the photo must be the one the AI looked at, not a different (better) one
  if (!attempt.photo_hash || createHash('sha256').update(image).digest('hex') !== attempt.photo_hash) return fail(res, 400, 'photo_mismatch')

  const hit = await apiHit(user.id, 'report', PER_MINUTE, PER_DAY, GLOBAL_PER_DAY)
  if (!hit.ok) return hit.reason === 'unavailable' ? fail(res, 500, 'server_error') : fail(res, 429, 'report_limit')

  // one report per attempt: only a row that has no review status yet can become pending, so a second request finds nothing
  const upd = await rest(`verification_attempts?id=eq.${attempt.id}&user_id=eq.${user.id}&review_status=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      review_status: 'pending',
      review_image: image.replace(/^data:image\/\w+;base64,/, ''),
      reported_by_user: true,
      user_note: typeof note === 'string' ? note.trim().slice(0, 200) || null : null,
      reported_at: new Date().toISOString(),
    }),
  })
  if (!upd.ok) return fail(res, 500, 'db_error')
  const done2 = (await upd.json()) as unknown[]
  if (!done2.length) return fail(res, 409, 'already_reported')
  return res.json({ ok: true })
}
