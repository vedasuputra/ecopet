import { createHash } from 'node:crypto'
import { quests } from '../src/data/quests.js'
import { haversine } from '../src/lib/geo.js'
import { callGemini, sendError, type Req, type Res } from './_gemini.js'
import { hashExists, saveHash } from './_supabase.js'

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

  const { questId, image, lat, lng, timestamp } = req.body ?? {}
  const quest = quests.find((q) => q.id === questId)
  if (!quest) return res.status(400).json({ ok: false, message: 'Unknown quest' })
  if (!quest.requiredObject && !quest.requiredScene) {
    return res.status(400).json({ ok: false, message: 'This quest has no photo verification' })
  }
  if (typeof image !== 'string' || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ ok: false, message: 'Missing image or location' })
  }

  // Layer 1: location (repeated on the server, never trust the client's check)
  const dist = haversine(lat, lng, quest.lat, quest.lng)
  if (dist > quest.radiusM) {
    return res.json({
      ok: false,
      reason: 'too_far',
      message: `Kamu masih ${(dist / 1000).toFixed(1)} km dari lokasi quest`,
    })
  }

  // Anti-cheat: stale photo
  if (typeof timestamp !== 'number' || Math.abs(Date.now() - timestamp) > MAX_PHOTO_AGE_MS) {
    return res.json({ ok: false, reason: 'stale', message: 'Foto terlalu lama, ambil foto baru' })
  }

  // Anti-cheat: duplicate photo
  const hash = createHash('sha256').update(image).digest('hex')
  if (await hashExists(hash)) {
    return res.json({ ok: false, reason: 'duplicate', message: 'Foto ini sudah pernah dipakai' })
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
    if (pass) await saveHash(hash, quest.id)
    return res.json({
      ok: pass,
      reason: pass ? 'verified' : r.is_screenshot_or_screen ? 'screenshot' : 'not_detected',
      message: pass ? 'Terverifikasi!' : `Foto belum cocok: ${r.reason}`,
      confidence: r.confidence,
      detail: r.reason,
    })
  } catch (e) {
    return sendError(res, e)
  }
}
