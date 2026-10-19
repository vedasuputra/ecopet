// Thin client for the serverless functions in /api (Gemini key stays on the server).
// Locally these only exist under `npx vercel dev`; plain `npm run dev` will 404.

import type { Key } from '../i18n'

export interface ApiResult {
  ok: boolean
  message?: string
  error?: string
  reason?: string
  [k: string]: unknown
}

async function post(path: string, body: unknown): Promise<ApiResult> {
  try {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return await r.json()
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
  return t(fallback)
}

export const verifyQuest = (p: {
  questId: string
  image: string
  lat: number
  lng: number
  timestamp: number
}) => post('/api/verify', p)

export const askMeilu = (p: {
  message: string
  history: { role: 'user' | 'meilu'; text: string }[]
  placeName: string
  lat: number
  lng: number
  nearest?: { name: string; distanceM: number }
  activeQuests: string[]
  language: 'en' | 'vi'
}) => post('/api/chat', p)
