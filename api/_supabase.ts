import { quests as staticQuests } from '../src/data/quests.js'

// Server-only Supabase access via REST, using the service_role key (bypasses RLS).
// Never import this from src/. Falls back to in-memory if env vars are missing (local dev).

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

const memory = new Set<string>()

const headers = () => ({
  apikey: key as string,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
})

export async function hashExists(hash: string): Promise<boolean> {
  if (!url || !key) return memory.has(hash)
  const r = await fetch(`${url}/rest/v1/photo_hashes?hash=eq.${hash}&select=hash`, { headers: headers() })
  if (!r.ok) {
    console.error('photo_hashes lookup failed', r.status, await r.text())
    return memory.has(hash) // fail open to memory rather than blocking users
  }
  return (await r.json()).length > 0
}

export async function saveHash(hash: string, questId: string): Promise<void> {
  memory.add(hash)
  if (!url || !key) return
  const r = await fetch(`${url}/rest/v1/photo_hashes`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ hash, quest_id: questId }),
  })
  if (!r.ok && r.status !== 409) console.error('photo_hashes insert failed', r.status, await r.text())
}

// --- Auth + generic REST helpers used by /api/vendor ---------------------------------------------

const anon = process.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = () => !!(url && key && anon)

/** Verifies a user's access token with Supabase Auth and returns their id and email (or null). */
export async function userFromToken(token: string): Promise<{ id: string; email: string } | null> {
  if (!url || !anon || !token) return null
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  const u = await r.json()
  return u?.id ? { id: u.id as string, email: String(u.email ?? '') } : null
}

/** PostgREST call with the service_role key (bypasses RLS). Path is relative to /rest/v1/. */
export function rest(path: string, init: RequestInit = {}) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) },
  })
}

/** Calls a SQL function through PostgREST. Postgres `raise exception 'x'` comes back as error 'x'. */
export async function rpc(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; data?: any; error?: string }> {
  const r = await rest(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
  const body = await r.json().catch(() => null)
  if (r.ok) return { ok: true, data: body }
  return { ok: false, error: String(body?.message ?? 'db_error') }
}

/** Bearer token from a request, verified against Supabase Auth. */
export async function authedUser(req: { headers?: Record<string, string | string[] | undefined> }) {
  const auth = req.headers?.authorization
  const token = String(Array.isArray(auth) ? auth[0] : (auth ?? '')).replace(/^Bearer\s+/i, '')
  return userFromToken(token)
}

/** Deletes an auth user; the database cascades their profile, wallet, coupons, chat limits, etc. */
export async function deleteAuthUser(userId: string): Promise<boolean> {
  if (!url || !key) return false
  const r = await fetch(`${url}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: headers() })
  return r.ok
}

/** GET rows through PostgREST with the service key (empty array on error). */
export async function getJsonRows<T>(path: string): Promise<T[]> {
  const r = await rest(path)
  return r.ok ? ((await r.json()) as T[]) : []
}

// --- Quests: defined in the database (edit them in Supabase -> Table Editor) ------------------------

export interface ServerQuest {
  id: string
  /** General quests can be done anywhere: no location check. */
  general: boolean
  lat: number
  lng: number
  radiusM: number
  rewardCoins: number
  requiredObject?: string
  requiredScene?: string
  /** What the photo must show as evidence (purchase, bicycle, hand-rowed boat...). */
  photoProof?: string
}

let questCache: { at: number; list: ServerQuest[] } | null = null

/**
 * Active quests from the `quests` table, cached for a minute. If the table cannot be read at all
 * (for example the migration has not been run yet) the built-in data in src/data/quests.ts is used.
 */
export async function loadQuests(): Promise<ServerQuest[]> {
  const ttl = Number(process.env.QUEST_CACHE_MS ?? 60_000) // 0 = always re-read (used by tests)
  if (questCache && Date.now() - questCache.at < ttl) return questCache.list
  try {
    // select=* so a database that has not got the "scope" column yet still works (all quests are then place-specific)
    const r = await rest('quests?active=eq.true&select=*&order=sort')
    if (r.ok) {
      const rows = (await r.json()) as { id: string; scope?: string; lat: number | null; lng: number | null; radius_m: number | null; reward_coins: number; required_object: string | null; required_scene: string | null; photo_proof?: string | null }[]
      const list = rows.map((q) => ({
        id: q.id,
        general: q.scope === 'general',
        lat: q.lat ?? 0,
        lng: q.lng ?? 0,
        radiusM: q.radius_m ?? 0,
        rewardCoins: q.reward_coins,
        requiredObject: q.required_object ?? undefined,
        requiredScene: q.required_scene ?? undefined,
        photoProof: q.photo_proof ?? undefined,
      }))
      questCache = { at: Date.now(), list }
      return list
    }
  } catch {
    /* fall through to the built-in quests */
  }
  return staticQuests.map((q) => ({ id: q.id, general: q.scope === 'general', lat: q.lat, lng: q.lng, radiusM: q.radiusM, rewardCoins: q.rewardCoins, requiredObject: q.requiredObject, requiredScene: q.requiredScene, photoProof: q.photoProof }))
}

// --- Helpers for verification, review and rate limits ---------------------------------------------

/** Midnight (Vietnam time, UTC+7, no daylight saving) of today, as an ISO string. */
export function vnDayStartISO(now = new Date()): string {
  const vn = new Date(now.getTime() + 7 * 3600 * 1000)
  vn.setUTCHours(0, 0, 0, 0)
  return new Date(vn.getTime() - 7 * 3600 * 1000).toISOString()
}

/** Counts a call against a per-user + global limit. Returns 'ok' or why it was refused. Fails CLOSED. */
export async function apiHit(
  userId: string,
  kind: string,
  perMinute: number,
  perDay: number,
  globalPerDay: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const r = await rpc('api_hit', { p_user: userId, p_kind: kind, p_per_minute: perMinute, p_per_day: perDay, p_global_per_day: globalPerDay })
  if (!r.ok) return { ok: false, reason: 'unavailable' }
  return r.data === 'ok' ? { ok: true } : { ok: false, reason: String(r.data) }
}

export interface AttemptRow {
  user_id: string
  quest_id: string
  outcome: 'verified' | 'rejected' | 'review'
  reason: string
  confidence?: number | null
  quest_met?: boolean | null
  red_flags?: string[]
  ai_reason?: string | null
  distance_m?: number | null
  photo_hash?: string | null
  photo_phash?: string | null
  review_image?: string | null
  review_status?: 'pending' | null
}

/** Writes one line of the verification log. Returns its id, or null if the log is unavailable. */
export async function logAttempt(row: AttemptRow): Promise<number | null> {
  try {
    const r = await rest('verification_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ red_flags: [], ...row }),
    })
    if (!r.ok) {
      console.error('verification_attempts insert failed', r.status, (await r.text()).slice(0, 200))
      return null
    }
    return ((await r.json()) as { id: number }[])[0]?.id ?? null
  } catch (e) {
    console.error(e)
    return null
  }
}
