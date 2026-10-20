// Thin client for the serverless functions in /api (Gemini key and service key stay on the server).
// Locally they are served by `npm run dev` (see vite.config.ts) or `npx vercel dev`.

import type { Key } from '../i18n'
import { supabase } from './supabase'

export interface ApiResult {
  ok: boolean
  message?: string
  error?: string
  reason?: string
  [k: string]: unknown
}

async function post(path: string, body: unknown, withAuth = false): Promise<ApiResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (withAuth) {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token
      if (token) headers.Authorization = `Bearer ${token}`
    }
    // never wait forever: a hanging server must not leave the screen stuck on "typing" / "checking"
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30000)
    try {
      const r = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal })
      return await r.json()
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return { ok: false, error: 'unreachable' }
  }
}

type T = (key: Key, params?: Record<string, string | number>) => string

/** Turns a failed API result into text in the user's language. Server codes map to translated messages. */
export function failureMessage(r: ApiResult, t: T, fallback: Key): string {
  if (r.error === 'unreachable') return t('unreachable')
  if (r.error === 'rate_limit') return t('rateLimit')
  if (r.error === 'server_error') return t('serverError')
  if (r.error === 'unauthorized') return t('chatLogin')
  if (r.error === 'message_too_long') return t('chatTooLong')
  if (r.error === 'chat_limit') return t(r.reason === 'per_minute' ? 'chatSlowDown' : r.reason === 'per_day' ? 'chatDailyLimit' : 'chatBusy')
  if (r.error === 'verify_limit') return t(r.reason === 'per_minute' ? 'verifyLimit' : r.reason === 'per_day' ? 'verifyLimitDay' : 'chatBusy')
  return t(fallback)
}

/** Quest photo check. Signed-in only: the server pays the reward to the account. */
export const verifyQuest = (p: {
  questId: string
  image: string
  lat: number
  lng: number
  timestamp: number
}) => post('/api/verify', p, true)

/** "The AI got this photo wrong": sends the rejected photo to the admin review queue. */
export const reportAttempt = (p: { attemptId: number; image: string; note?: string }) => post('/api/report', p, true)

export const askMeilu = (p: {
  message: string
  history: { role: 'user' | 'meilu'; text: string }[]
  placeName: string
  lat: number
  lng: number
  nearest?: { name: string; distanceM: number }
  activeQuests: string[]
  language: 'en' | 'vi'
  plan?: string
  style?: unknown
  pageText?: string
}) => post('/api/chat', p, true)

/** Asks the server for an itinerary (one AI call). Falls back to rules on the server if the AI is unavailable. */
export const requestItinerary = (p: { days: number; destinations: string[]; language: 'en' | 'vi'; style?: unknown }) =>
  post('/api/itinerary', p, true)

/** Everything that changes coins, coupons or the welcome gift goes through here (server-checked). */
export const economyApi = (action: string, extra: Record<string, unknown> = {}) =>
  post('/api/economy', { action, ...extra }, true)
