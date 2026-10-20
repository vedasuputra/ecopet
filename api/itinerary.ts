import { GeminiError, callGemini, type Req, type Res } from './_gemini.js'
import { loadCatalog } from './_grounding.js'
import { apiHit, authedUser, supabaseConfigured } from './_supabase.js'
import { nearestVendors, rulePlan, validatePlan, type PlanContext } from '../src/lib/planner.js'
import { questsPerDay, sanitizeStyle, styleSummary } from '../src/lib/travelerStyle.js'

// "Plan my days with Meilu": ONE Gemini call per request. The model only chooses among quests,
// vendors and destinations that exist in the database (the schema even lists them as the only
// allowed values), and everything it returns is validated again here. If the AI is unavailable,
// over its limit or returns something unusable, the rule-based plan is returned instead, so the
// traveler always gets an itinerary.

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
const PER_MINUTE = num(process.env.ITINERARY_PER_MINUTE, 2)
const PER_DAY = num(process.env.ITINERARY_PER_DAY, 6)
const GLOBAL_PER_DAY = num(process.env.ITINERARY_GLOBAL_PER_DAY, 300)

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  if (!supabaseConfigured()) return res.status(500).json({ ok: false, error: 'not_configured' })
  const user = await authedUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'unauthorized' })

  const { days: rawDays, destinations: rawDest, language, style: rawStyle } = req.body ?? {}
  const days = Math.round(Number(rawDays))
  if (!Number.isFinite(days) || days < 1 || days > 14) return res.status(400).json({ ok: false, error: 'bad_days' })

  const catalog = await loadCatalog()
  const known = [...new Set(catalog.quests.map((q) => q.destination))]
  const picked = (Array.isArray(rawDest) ? rawDest : []).filter((d): d is string => typeof d === 'string' && known.includes(d))
  const destinations = picked.length ? [...new Set(picked)] : known
  const lang = language === 'vi' ? 'vi' : 'en'

  const style = sanitizeStyle(rawStyle) // only known values ever reach the prompt
  const perDay = questsPerDay(style)
  const ctx: PlanContext = { days, destinations, quests: catalog.quests, vendors: catalog.vendors, lang, style }
  const fallback = (why: string) => res.json({ ok: true, itinerary: rulePlan(ctx, why) })

  // limit on AI planning (free Gemini quota); a refusal still returns the rule-based plan
  const hit = await apiHit(user.id, 'itinerary', PER_MINUTE, PER_DAY, GLOBAL_PER_DAY)
  if (!hit.ok) return fallback('limit')

  // The data the model may use, grouped by destination (the traveler's own destinations first)
  const order = [...destinations, ...known.filter((d) => !destinations.includes(d))]
  const dataBlock = order
    .map((dest) => {
      const qs = catalog.quests.filter((q) => q.destination === dest).map((q) => `${q.id} "${q.title}" (${q.type})`).join('; ')
      const vs = nearestVendors(dest, catalog.vendors, 3, 20, style?.interests ?? []).map((v) => `${v.id} "${v.name}" (${v.category})`).join('; ')
      return `DESTINATION ${dest}${destinations.includes(dest) ? ' [traveler is going here]' : ' [other]'}:\n  quests: ${qs || 'none'}\n  partner shops: ${vs || 'none'}`
    })
    .join('\n')

  const questIds = catalog.quests.map((q) => q.id)
  const vendorIds = catalog.vendors.map((v) => v.id)
  const dayProps: Record<string, unknown> = {
    day: { type: 'INTEGER' },
    destination: { type: 'STRING', enum: known },
    theme: { type: 'STRING' },
    quest_ids: { type: 'ARRAY', items: { type: 'STRING', enum: questIds } },
    note: { type: 'STRING' },
  }
  const required = ['day', 'destination', 'theme', 'quest_ids', 'note']
  if (vendorIds.length) {
    dayProps.vendor_ids = { type: 'ARRAY', items: { type: 'STRING', enum: vendorIds } }
    required.push('vendor_ids')
  }
  const schema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      days: { type: 'ARRAY', items: { type: 'OBJECT', properties: dayProps, required } },
    },
    required: ['summary', 'days'],
  }

  const prompt =
    `Plan a ${days}-day trip in Vietnam's Mekong Delta for a young traveler going to: ${destinations.join(', ')}.\n\n` +
    `${dataBlock}\n\n` +
    `RULES:\n` +
    `- Return exactly ${days} days, numbered 1 to ${days}.\n` +
    `- Use ONLY the quest ids, partner shop ids and destinations listed above. Never invent any.\n` +
    `- Each quest may appear at most once in the whole plan; at most ${perDay} quests a day; prefer a mix of quest types and the destinations the traveler is going to.\n` +
    (style
      ? `TRAVELER PROFILE (Meilu asked the traveler): ${styleSummary(style)}.\n` +
        `- Fit the plan to this profile: favour quest types and partner shops that match the interests, keep to the pace, suit the people they travel with and their budget, ` +
        `and ${style.earlyRiser ? 'early starts are fine (for example a dawn floating market)' : 'do NOT plan early starts: put the floating market later in the morning or on a relaxed day'}.\n`
      : '') +
    `- theme: at most 8 words. note: one friendly, generic tip of at most 20 words. summary: one sentence.\n` +
    `- Do NOT state opening hours, prices, distances, addresses, phone numbers or any fact that is not in the lists above.\n` +
    `- Write theme, note and summary in ${lang === 'vi' ? 'Vietnamese' : 'English'}.`

  try {
    const text = await callGemini({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4, maxOutputTokens: 1500 },
    })
    const plan = validatePlan(JSON.parse(text), ctx)
    return plan ? res.json({ ok: true, itinerary: plan }) : fallback('invalid')
  } catch (e) {
    if (e instanceof GeminiError && e.rateLimited) return fallback('rate_limit')
    console.error(e)
    return fallback('error')
  }
}
