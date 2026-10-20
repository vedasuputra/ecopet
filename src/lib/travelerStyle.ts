// "What kind of traveler are you?": the answers Meilu asks for before planning, and how they steer
// the plan. Shared by the app (quiz, rule-based planner) and the server (validates what the client
// sends before it goes into an AI prompt).

export const PACES = ['relaxed', 'balanced', 'packed'] as const
export const INTERESTS = ['nature', 'food', 'markets', 'culture', 'adventure', 'relax'] as const
export const COMPANIES = ['solo', 'friends', 'couple', 'family'] as const
export const BUDGETS = ['low', 'mid', 'high'] as const

export type Pace = (typeof PACES)[number]
export type Interest = (typeof INTERESTS)[number]
export type Company = (typeof COMPANIES)[number]
export type Budget = (typeof BUDGETS)[number]

export interface TravelerStyle {
  pace: Pace
  interests: Interest[] // empty = no preference, "surprise me"
  company: Company
  budget: Budget
  earlyRiser: boolean // floating markets are best at dawn
}

export const DEFAULT_STYLE: TravelerStyle = { pace: 'balanced', interests: [], company: 'solo', budget: 'mid', earlyRiser: true }

/** How many quests one day holds: a relaxed traveler 2, balanced 3, packed 4. */
export const questsPerDay = (s?: Pick<TravelerStyle, 'pace'> | null) => (s?.pace === 'relaxed' ? 2 : s?.pace === 'packed' ? 4 : 3)

// Which quest types suit which interest (the types in the quests table)
const QUEST_TYPES: Record<Interest, string[]> = {
  nature: ['hiking', 'rowing', 'cycling', 'orchard'],
  food: ['local_food', 'local_goods', 'orchard', 'traditional_market', 'floating_market', 'redeem_coupon', 'reusable_utensils'],
  markets: ['floating_market', 'traditional_market', 'local_goods', 'redeem_coupon'],
  culture: ['craft', 'traditional_market', 'floating_market', 'local_food'],
  adventure: ['hiking', 'cycling', 'rowing', 'bus'],
  relax: ['rowing', 'orchard', 'reusable_bottle', 'reusable_utensils'],
}

// Which partner-shop categories (English names) suit which interest
const VENDOR_WORDS: Record<Interest, string[]> = {
  nature: ['bike', 'fruit'],
  food: ['food', 'fruit', 'cafe'],
  markets: ['fruit', 'souvenir', 'craft'],
  culture: ['craft', 'souvenir'],
  adventure: ['bike'],
  relax: ['cafe', 'fruit'],
}

export const interestQuestTypes = (interests: Interest[]) => new Set(interests.flatMap((i) => QUEST_TYPES[i] ?? []))
export const vendorMatches = (categoryEn: string, interests: Interest[]) => {
  const c = categoryEn.toLowerCase()
  return interests.some((i) => (VENDOR_WORDS[i] ?? []).some((w) => c.includes(w)))
}

const pick = <T extends string>(allowed: readonly T[], v: unknown, fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

/** Cleans whatever a client sent into a valid style (unknown values fall back to the defaults). Null if it is not an object. */
export function sanitizeStyle(raw: unknown): TravelerStyle | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    pace: pick(PACES, r.pace, DEFAULT_STYLE.pace),
    interests: [...new Set((Array.isArray(r.interests) ? r.interests : []).filter((i): i is Interest => INTERESTS.includes(i as Interest)))],
    company: pick(COMPANIES, r.company, DEFAULT_STYLE.company),
    budget: pick(BUDGETS, r.budget, DEFAULT_STYLE.budget),
    earlyRiser: typeof r.earlyRiser === 'boolean' ? r.earlyRiser : DEFAULT_STYLE.earlyRiser,
  }
}

/** One line in English for an AI prompt, built only from the validated values above. */
export function styleSummary(s: TravelerStyle | null | undefined): string {
  if (!s) return ''
  return (
    `pace: ${s.pace}; interests: ${s.interests.length ? s.interests.join(', ') : 'no preference'}; ` +
    `travelling with: ${s.company}; budget: ${s.budget}; likes early mornings: ${s.earlyRiser ? 'yes' : 'no'}`
  )
}
