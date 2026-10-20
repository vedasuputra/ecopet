import { createHash } from 'node:crypto'
import { haversine } from '../src/lib/geo.js'
import { REPORTABLE_REASONS } from './report.js'
import { dhash, hamming, SIMILAR_MAX_DISTANCE } from './_phash.js'
import { callGemini, sendError, type Req, type Res } from './_gemini.js'
import {
  apiHit,
  authedUser,
  hashExists,
  loadQuests,
  logAttempt,
  rest,
  rpc,
  saveHash,
  supabaseConfigured,
  vnDayStartISO,
} from './_supabase.js'

// Quest photo verification. Order of work (cheap checks first, so the free Gemini quota is only
// spent on photos that could actually count):
//   sign-in -> quest exists -> already done / already under review -> location -> photo age ->
//   exact duplicate -> daily quest limit -> per-user rate limit -> similar-photo check -> Gemini
// Every outcome is written to the verification log. Unsure photos go to a human review queue.

const MAX_PHOTO_AGE_MS = 2 * 60 * 1000
const PASS_CONFIDENCE = 0.7 // at or above this (and nothing suspicious): paid automatically
const REVIEW_MIN_CONFIDENCE = 0.5 // from here up to PASS_CONFIDENCE: a person decides

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
const QUESTS_PER_DAY = num(process.env.QUEST_PER_DAY, 5)
const VERIFY_PER_MINUTE = num(process.env.VERIFY_PER_MINUTE, 4)
const VERIFY_PER_DAY = num(process.env.VERIFY_PER_DAY, 30)
const VERIFY_GLOBAL_PER_DAY = num(process.env.VERIFY_GLOBAL_PER_DAY, 500)

// Flags that mean "do not trust this photo", whatever the confidence.
const HARD_FLAGS = ['screen_photo', 'stock_or_internet_image', 'ai_generated', 'edited_or_overlay']
const RED_FLAGS = [...HARD_FLAGS, 'wrong_object', 'wrong_place', 'blurry', 'too_dark', 'no_context', 'other']

const schema = {
  type: 'OBJECT',
  properties: {
    quest_met: { type: 'BOOLEAN' },
    confidence: { type: 'NUMBER' },
    is_screenshot_or_screen: { type: 'BOOLEAN' },
    red_flags: { type: 'ARRAY', items: { type: 'STRING', enum: RED_FLAGS } },
    evidence_shown: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
  },
  required: ['quest_met', 'confidence', 'is_screenshot_or_screen', 'red_flags', 'evidence_shown', 'reason'],
}

interface AiResult {
  quest_met: boolean
  confidence: number
  is_screenshot_or_screen: boolean
  red_flags: string[]
  /** The photo also shows the evidence the quest asks for (the item bought, the bicycle, the boat...). */
  evidence_shown: boolean
  reason: string
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'POST only' })

  // The reward is paid to the account, so the caller must be signed in.
  if (!supabaseConfigured()) return res.status(500).json({ ok: false, error: 'not_configured' })
  const user = await authedUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })

  const { questId, image, lat, lng, timestamp } = req.body ?? {}
  const quest = (await loadQuests()).find((q) => q.id === questId)
  if (!quest) return res.status(400).json({ ok: false, message: 'Unknown quest' })
  if (!quest.requiredObject && !quest.requiredScene) {
    return res.status(400).json({ ok: false, message: 'This quest has no photo verification' })
  }
  // a general quest can be done anywhere, so it needs no location
  if (typeof image !== 'string' || (!quest.general && (typeof lat !== 'number' || typeof lng !== 'number'))) {
    return res.status(400).json({ ok: false, message: 'Missing image or location' })
  }
  const base64 = image.replace(/^data:image\/\w+;base64,/, '')

  // Short-hand for the log: every refusal below records why.
  const reject = async (reason: string, extra: Partial<Parameters<typeof logAttempt>[0]> = {}) => {
    await logAttempt({ user_id: user.id, quest_id: quest.id, outcome: 'rejected', reason, ...extra })
  }

  // Already done? Already waiting for a person to look at it? Say so before spending anything.
  const done = await rest(`quest_progress?user_id=eq.${user.id}&quest_id=eq.${encodeURIComponent(quest.id)}&select=quest_id`)
  if (done.ok && ((await done.json()) as unknown[]).length) {
    return res.json({ ok: false, reason: 'already_done', message: 'You already completed this quest' })
  }
  const pending = await rest(
    `verification_attempts?user_id=eq.${user.id}&quest_id=eq.${encodeURIComponent(quest.id)}&review_status=eq.pending&select=id&limit=1`,
  )
  if (pending.ok && ((await pending.json()) as unknown[]).length) {
    return res.json({ ok: false, reason: 'review_pending', message: 'Your photo for this quest is waiting for a review' })
  }

  // Layer 1: location (repeated on the server, never trust the client's check). Skipped for general quests.
  const dist = quest.general ? null : haversine(lat, lng, quest.lat, quest.lng)
  const distM = dist == null ? null : Math.round(dist)
  if (dist != null && dist > quest.radiusM) {
    await reject('too_far', { distance_m: distM })
    return res.json({
      ok: false,
      reason: 'too_far',
      distanceM: distM,
      message: `You are still ${(dist / 1000).toFixed(1)} km from the quest location`,
    })
  }

  // Anti-cheat: stale photo
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > MAX_PHOTO_AGE_MS) {
    await reject('stale', { distance_m: distM })
    return res.json({ ok: false, reason: 'stale', message: 'The photo is too old, take a new one' })
  }

  // Anti-cheat: the exact same photo
  const hash = createHash('sha256').update(image).digest('hex')
  if (await hashExists(hash)) {
    await reject('duplicate', { distance_m: distM, photo_hash: hash })
    return res.json({ ok: false, reason: 'duplicate', message: 'This photo has already been used' })
  }

  // Daily cap on completed quests (before any AI call)
  const today = await rest(`quest_progress?user_id=eq.${user.id}&completed_at=gte.${encodeURIComponent(vnDayStartISO())}&select=quest_id`)
  const doneToday = today.ok ? ((await today.json()) as unknown[]).length : 0
  if (doneToday >= QUESTS_PER_DAY) {
    await reject('daily_limit', { distance_m: distM, photo_hash: hash })
    return res.json({ ok: false, reason: 'daily_limit', limit: QUESTS_PER_DAY, message: 'Daily quest limit reached' })
  }

  // Per-user and global limit on AI checks (protects the free Gemini quota). Fails closed.
  const hit = await apiHit(user.id, 'verify', VERIFY_PER_MINUTE, VERIFY_PER_DAY, VERIFY_GLOBAL_PER_DAY)
  if (!hit.ok) {
    if (hit.reason === 'unavailable') return res.status(500).json({ ok: false, error: 'server_error' })
    return res.status(429).json({ ok: false, error: 'verify_limit', reason: hit.reason })
  }

  // Layer 2: does the picture look like one somebody ELSE already sent for this quest?
  const phash = dhash(base64)
  let similar = false
  if (phash) {
    const others = await rest(
      `verification_attempts?quest_id=eq.${encodeURIComponent(quest.id)}&user_id=neq.${user.id}&outcome=in.(verified,review)&photo_phash=not.is.null&select=photo_phash&order=created_at.desc&limit=500`,
    )
    const list = others.ok ? ((await others.json()) as { photo_phash: string }[]) : []
    similar = list.some((o) => hamming(phash, o.photo_phash) <= SIMILAR_MAX_DISTANCE)
  }

  // Layer 3: what the photo shows, checked by Gemini with structured output
  const target = quest.requiredObject
    ? `a clear photo of: ${quest.requiredObject}`
    : `a photo taken at: ${quest.requiredScene}`
  const prompt =
    `You verify photos for a travel quest in Vietnam's Mekong Delta. Required: ${target}. ` +
    `quest_met is true only if the photo genuinely shows it. confidence (0 to 1) is how sure you are that the requirement is met. ` +
    `Set is_screenshot_or_screen=true if the photo is a screenshot or a picture of a screen/monitor/printed photo. ` +
    `red_flags lists every problem you see, using only the allowed values (empty list if none): screen_photo, stock_or_internet_image, ai_generated, edited_or_overlay, wrong_object, wrong_place, blurry, too_dark, no_context, other. ` +
    (quest.photoProof
      ? `The photo must ALSO clearly show this evidence: ${quest.photoProof}. evidence_shown is true only if that evidence is really visible; a photo of the place alone, without the evidence, is false. `
      : `evidence_shown is true. `) +
    `reason is one short sentence in English.`

  let ai: AiResult
  try {
    const text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
    })
    const parsed = JSON.parse(text) as Partial<AiResult>
    ai = {
      quest_met: parsed.quest_met === true,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      is_screenshot_or_screen: parsed.is_screenshot_or_screen === true,
      red_flags: (Array.isArray(parsed.red_flags) ? parsed.red_flags : []).filter((f) => RED_FLAGS.includes(f)),
      evidence_shown: quest.photoProof ? parsed.evidence_shown === true : true,
      reason: String(parsed.reason ?? '').slice(0, 300),
    }
  } catch (e) {
    return sendError(res, e)
  }

  // Decide: verified (paid now) / review (a person decides) / rejected
  const hard = ai.is_screenshot_or_screen || ai.red_flags.some((f) => HARD_FLAGS.includes(f))
  let outcome: 'verified' | 'review' | 'rejected'
  let reason: string
  if (hard) {
    outcome = 'rejected'
    reason = ai.is_screenshot_or_screen || ai.red_flags.includes('screen_photo') ? 'screenshot' : 'suspicious'
  } else if (ai.quest_met && !ai.evidence_shown) {
    // the place or object looks right, but there is no sign of the purchase / the bike / the boat
    outcome = 'rejected'
    reason = 'no_evidence'
  } else if (ai.quest_met && ai.confidence >= PASS_CONFIDENCE) {
    outcome = similar ? 'review' : 'verified'
    reason = similar ? 'similar_photo' : 'verified'
  } else if (ai.quest_met && ai.confidence >= REVIEW_MIN_CONFIDENCE) {
    outcome = 'review'
    reason = similar ? 'similar_photo' : 'low_confidence'
  } else {
    outcome = 'rejected'
    reason = 'not_detected'
  }

  const base = {
    user_id: user.id,
    quest_id: quest.id,
    confidence: ai.confidence,
    quest_met: ai.quest_met,
    red_flags: ai.red_flags,
    ai_reason: ai.reason,
    distance_m: distM,
    photo_hash: hash,
    photo_phash: phash,
  }

  if (outcome === 'verified') {
    await saveHash(hash, quest.id)
    await logAttempt({ ...base, outcome, reason })
    // The server pays the reward (idempotent: a quest pays once per account).
    const paid = await rpc('complete_quest', { p_user: user.id, p_quest: quest.id, p_reward: quest.rewardCoins })
    if (!paid.ok) return res.status(500).json({ ok: false, error: 'db_error' })
    if (paid.data === -1) return res.json({ ok: false, reason: 'already_done', message: 'You already completed this quest' })
    return res.json({ ok: true, reason: 'verified', message: 'Verified!', confidence: ai.confidence, detail: ai.reason })
  }

  if (outcome === 'review') {
    // Keep the photo ONLY so a person can look at it; it is deleted when they decide.
    const id = await logAttempt({ ...base, outcome, reason, review_image: base64, review_status: 'pending' })
    if (id !== null) {
      await saveHash(hash, quest.id)
      return res.json({ ok: false, reason: 'review', message: 'A person will review your photo', confidence: ai.confidence, detail: ai.reason })
    }
    // The review queue is not available (not set up yet): do not keep the photo, just refuse.
    outcome = 'rejected'
    reason = 'low_confidence'
  }

  const attemptId = await logAttempt({ ...base, outcome, reason })
  const reasonCode = reason === 'screenshot' ? 'screenshot' : reason === 'suspicious' ? 'suspicious' : reason === 'no_evidence' ? 'no_evidence' : 'not_detected'
  return res.json({
    ok: false,
    reason: reasonCode,
    message: `Photo does not match: ${ai.reason}`,
    confidence: ai.confidence,
    detail: ai.reason,
    flags: ai.red_flags,
    // the traveler may report an AI rejection (the photo then goes to the admin review queue)
    ...(attemptId !== null && REPORTABLE_REASONS.includes(reason) ? { attemptId } : {}),
  })
}
