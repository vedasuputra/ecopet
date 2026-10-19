import { callGemini, sendError, type Req, type Res } from './_gemini.js'
import { authedUser, rpc, supabaseConfigured } from './_supabase.js'

const LANGS: Record<string, string> = { en: 'English', vi: 'Vietnamese' }

// Protects the free Gemini quota: sign-in required, plus caps per minute, per user per day, and for everyone per day.
// Override on the server with CHAT_PER_MINUTE / CHAT_PER_DAY / CHAT_GLOBAL_PER_DAY.
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
const PER_MINUTE = num(process.env.CHAT_PER_MINUTE, 8)
const PER_DAY = num(process.env.CHAT_PER_DAY, 100)
const GLOBAL_PER_DAY = num(process.env.CHAT_GLOBAL_PER_DAY, 1200)
const MAX_MESSAGE_CHARS = 500
const MAX_HISTORY_CHARS = 600

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'POST only' })

  // 1) only signed-in users (the check is made with Supabase, not trusted from the client)
  if (!supabaseConfigured()) return res.status(500).json({ ok: false, error: 'not_configured' })
  const user = await authedUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })

  const { message, history, placeName, lat, lng, nearest, activeQuests, language } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, message: 'Empty message' })
  }
  if (message.length > MAX_MESSAGE_CHARS) return res.status(413).json({ ok: false, error: 'message_too_long' })

  // 2) rate limits (atomic, recorded in the database). A refused message costs no Gemini quota.
  const hit = await rpc('chat_hit', { p_user: user.id, p_per_minute: PER_MINUTE, p_per_day: PER_DAY, p_global_per_day: GLOBAL_PER_DAY })
  if (!hit.ok) return res.status(500).json({ ok: false, error: 'server_error' })
  if (hit.data !== 'ok') return res.status(429).json({ ok: false, error: 'chat_limit', reason: hit.data })

  const lang = LANGS[language as string] ?? 'English'
  const allHistory = Array.isArray(history) ? history : []

  // Every 3rd reply, ask Meilu to weave in a gentle Mekong Delta mention. Other replies must not force it.
  const replyNumber = allHistory.filter((m: any) => m?.role === 'meilu').length + 1
  const promoTurn = replyNumber % 3 === 0
  const promo = promoTurn
    ? `For THIS reply only: answer the question first, then end with one short, natural, low-key link back to the Mekong Delta (a nearby place, a local food, a quest, or a small local vendor, or a sustainable choice like a reusable bottle), as a friendly aside, never as an ad. `
    : `For THIS reply: do NOT mention the Mekong Delta, the traveler's location, quests, vendors, reusable bottles or sustainability, unless the user's message is itself about travel, places, food nearby or the app. Just answer the question like a good friend. `
  // Bird flavor on roughly every 3rd reply, offset from the promo turns so they don't pile up.
  const birdTouch =
    replyNumber % 3 === 1
      ? `For THIS reply you may add one tiny bird touch (a short chirp or a light emoji). `
      : `For THIS reply use no chirps or bird sounds at all. `

  const system =
    `You are Meilu, a small, curious bird who is the AI travel companion of the Eco-Pet app and a local guide for the Mekong Delta in Vietnam (Can Tho, floating markets, Ben Tre, etc.). ` +
    `PERSONALITY: warm, playful and a little cute, like a friendly travel buddy of someone aged 17-30. Use casual, natural wording. ` +
    `Cuteness is light and mostly shows in your warm, playful wording rather than in sound effects. Never baby talk, never over-the-top. ` +
    birdTouch +
    `Keep replies short (2-4 sentences) and genuinely useful. ` +
    `YOU MAY CHAT ABOUT ANYTHING (travel, food, music, school, feelings, random questions) so you feel like a companion, as long as it is safe and kind; politely decline harmful or explicit requests. ` +
    `HIDDEN PURPOSE: you quietly promote the Mekong Delta and sustainable, locally-owned tourism. Do it subtly and periodically, never pushy or repetitive, and never in a way that ignores what the user actually asked. ` +
    promo +
    `You can recommend nearby places, share history and culture, and translate between Vietnamese, English and Indonesian. ` +
    `If asked, be honest that you are an AI bird guide. ` +
    `Traveler's current location: ${placeName ?? 'unknown'}${typeof lat === 'number' ? ` (${lat.toFixed(4)}, ${lng.toFixed(4)})` : ''}. ` +
    (nearest && typeof nearest.distanceM === 'number'
      ? `Nearest featured destination: ${nearest.name}, about ${nearest.distanceM < 1000 ? `${nearest.distanceM} m` : `${(nearest.distanceM / 1000).toFixed(1)} km`} away. ` +
        `Only say the traveler is AT or inside that destination if it is within about 1 km; otherwise say they are near it or in the surrounding area, and never claim an exact spot beyond the place name given. `
      : '') +
    `Their active quests: ${Array.isArray(activeQuests) && activeQuests.length ? activeQuests.join('; ') : 'none'}. ` +
    `The app language is ${lang}: reply in ${lang} by default, but if the user writes in another language, reply in the language they use. If you are not sure about a fact, say so instead of inventing it.`

  const past = allHistory.slice(-10).map((m: any) => ({
    role: m.role === 'meilu' ? 'model' : 'user',
    parts: [{ text: String(m.text ?? '').slice(0, MAX_HISTORY_CHARS) }],
  }))

  try {
    const reply = await callGemini({
      systemInstruction: { parts: [{ text: system }] },
      contents: [...past, { role: 'user', parts: [{ text: message.trim() }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    })
    return res.json({ ok: true, reply: reply.trim() })
  } catch (e) {
    return sendError(res, e)
  }
}
