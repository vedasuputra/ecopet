import { callGemini, sendError, type Req, type Res } from './_gemini.js'

const LANGS: Record<string, string> = { id: 'Indonesian', en: 'English', vi: 'Vietnamese' }

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'POST only' })

  const { message, history, placeName, lat, lng, activeQuests, language } = req.body ?? {}
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, message: 'Empty message' })
  }

  const lang = LANGS[language as string] ?? 'the same language the user writes in'
  const system =
    `You are Meilu, a friendly little bird who is a local guide for travelers in Vietnam's Mekong Delta (Can Tho, floating markets, Ben Tre, etc.). ` +
    `Keep answers short (2-4 sentences), warm and practical. You can recommend nearby places, share history and culture, and translate between Vietnamese, English and Indonesian. ` +
    `Encourage sustainable choices (public buses, reusable bottles and utensils, shopping at small local vendors) when it fits naturally. ` +
    `Traveler's current location: ${placeName ?? 'unknown'}${typeof lat === 'number' ? ` (${lat.toFixed(4)}, ${lng.toFixed(4)})` : ''}. ` +
    `Their active quests: ${Array.isArray(activeQuests) && activeQuests.length ? activeQuests.join('; ') : 'none'}. ` +
    `Reply in ${lang}. If you are not sure about a fact, say so instead of inventing it.`

  const past = (Array.isArray(history) ? history : []).slice(-10).map((m: any) => ({
    role: m.role === 'meilu' ? 'model' : 'user',
    parts: [{ text: String(m.text ?? '') }],
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
