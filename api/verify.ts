import { createHash } from 'node:crypto'
import { quests } from '../src/data/quests.js'
import { haversine } from '../src/lib/geo.js'
import { callGemini, sendError, type Req, type Res } from './_gemini.js'
import { authedUser, hashExists, rest, rpc, saveHash, supabaseConfigured } from './_supabase.js'

const MAX_PHOTO_AGE_MS = 2 * 60 * 1000
const MIN_CONFIDENCE = 0.7

const schema = {
  type: 'OBJECT',
  properties: {
    detected: { type: 'BOOLEAN' },
    confidence: { type: 'NUMBER' },
    is_screenshot_or_screen: { type: 'BOOLEAN' },
    reason: { type: 'STRING' },
  },
  required: ['detected', 'confidence', 'is_screenshot_or_screen', 'reason'],
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'POST only' })

  // The reward is paid to the account, so the caller must be signed in.
  if (!supabaseConfigured()) return res.status(500).json({ ok: false, error: 'not_configured' })
  const user = await authedUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })

  const { questId, image, lat, lng, timestamp } = req.body ?? {}
  const quest = quests.find((q) => q.id === questId)
  if (!quest) return res.status(400).json({ ok: false, message: 'Unknown quest' })
  if (!quest.requiredObject && !quest.requiredScene) {
    return res.status(400).json({ ok: false, message: 'This quest has no photo verification' })
  }
  if (typeof image !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ ok: false, message: 'Missing image or location' })
  }

  // Already done? Say so before spending an AI call.
  const done = await rest(`quest_progress?user_id=eq.${user.id}&quest_id=eq.${encodeURIComponent(quest.id)}&select=quest_id`)
  if (done.ok && ((await done.json()) as unknown[]).length) {
    return res.json({ ok: false, reason: 'already_done', message: 'You already completed this quest' })
  }

  // Layer 1: location (repeated on the server, never trust the client's check)
  const dist = haversine(lat, lng, quest.lat, quest.lng)
  if (dist > quest.radiusM) {
    return res.json({
      ok: false,
      reason: 'too_far',
      distanceM: Math.round(dist),
      message: `You are still ${(dist / 1000).toFixed(1)} km from the quest location`,
    })
  }

  // Anti-cheat: stale photo
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > MAX_PHOTO_AGE_MS) {
    return res.json({ ok: false, reason: 'stale', message: 'The photo is too old, take a new one' })
  }

  // Anti-cheat: duplicate photo
  const hash = createHash('sha256').update(image).digest('hex')
  if (await hashExists(hash)) {
    return res.json({ ok: false, reason: 'duplicate', message: 'This photo has already been used' })
  }

  // Layer 2: photo content, checked by Gemini with structured output
  const target = quest.requiredObject
    ? `a clear photo of: ${quest.requiredObject}`
    : `a photo taken at: ${quest.requiredScene}`
  const prompt =
    `You verify photos for a travel quest in Vietnam's Mekong Delta. Required: ${target}. ` +
    `Set detected=true only if the photo genuinely shows it. confidence is 0 to 1. ` +
    `Set is_screenshot_or_screen=true if the photo is a screenshot or a picture of a screen/monitor/printed photo. ` +
    `reason is one short sentence in English.`

  try {
    const text = await callGemini({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: image.replace(/^data:image\/\w+;base64,/, '') } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
    })
    const r = JSON.parse(text) as {
      detected: boolean
      confidence: number
      is_screenshot_or_screen: boolean
      reason: string
    }
    const pass = r.detected && r.confidence >= MIN_CONFIDENCE && !r.is_screenshot_or_screen
    if (pass) {
      await saveHash(hash, quest.id)
      // The server pays the reward (idempotent: a quest pays once per account).
      const paid = await rpc('complete_quest', { p_user: user.id, p_quest: quest.id, p_reward: quest.rewardCoins })
      if (!paid.ok) return res.status(500).json({ ok: false, error: 'db_error' })
      if (paid.data === -1) return res.json({ ok: false, reason: 'already_done', message: 'You already completed this quest' })
    }
    return res.json({
      ok: pass,
      reason: pass ? 'verified' : r.is_screenshot_or_screen ? 'screenshot' : 'not_detected',
      message: pass ? 'Verified!' : `Photo does not match: ${r.reason}`,
      confidence: r.confidence,
      detail: r.reason,
    })
  } catch (e) {
    return sendError(res, e)
  }
}
