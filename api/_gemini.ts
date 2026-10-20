// Shared Gemini REST helper. Server-only: GEMINI_API_KEY must never be exposed to the client.
// (Files starting with "_" are not turned into routes by Vercel.)

export interface Req {
  method?: string
  body?: any
  headers?: Record<string, string | string[] | undefined>
}
export interface Res {
  status: (code: number) => Res
  json: (body: unknown) => void
}

// Project decision: Gemini 3.1 Flash Lite is the model for every AI call (chat, planning, photo checks). Only when it is busy (503), over its
// quota (429) or does not answer in time, the same request is tried once on Gemini 3.5 Flash Lite.
const MODEL = 'gemini-3.1-flash-lite'
const BACKUP_MODEL = 'gemini-3.5-flash-lite'

export const RATE_LIMIT_MESSAGE =
  'The AI is not working right now due to a rate limit caused by the free plan. Please try again in a minute.'

export class GeminiError extends Error {
  rateLimited: boolean
  constructor(message: string, rateLimited = false) {
    super(message)
    this.rateLimited = rateLimited
  }
}

export async function callGemini(payload: Record<string, unknown>): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new GeminiError('GEMINI_API_KEY is not set')

  // Never wait for Gemini forever: a call that hangs would end with the platform cutting the whole function (after 60 s) and the traveler
  // seeing "can't reach the server". After 22 s a call is given up, and the next model is tried.
  const send = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(22_000),
    })
  const attempt = async (model: string): Promise<Response | null> => {
    try {
      return await send(model)
    } catch (e) {
      console.error(`[gemini] ${model}: no answer in time`, (e as Error).name)
      return null
    }
  }
  const busy = (res: Response | null) => !res || res.status === 429 || res.status === 503

  let r = await attempt(MODEL)
  if (busy(r)) {
    // the real reason (which quota, how long to wait) is in the body: it is written to the server log, never sent to the client
    console.error(`[gemini] ${MODEL} ${r?.status ?? 'timeout'}`, r ? (await r.text().catch(() => '')).slice(0, 400) : '')
    r = await attempt(BACKUP_MODEL)
    if (busy(r)) {
      console.error(`[gemini] ${BACKUP_MODEL} ${r?.status ?? 'timeout'}`, r ? (await r.text().catch(() => '')).slice(0, 400) : '')
      throw new GeminiError(RATE_LIMIT_MESSAGE, true)
    }
  }
  if (!r) throw new GeminiError(RATE_LIMIT_MESSAGE, true)
  if (!r.ok) throw new GeminiError(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`)

  const data = await r.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('')
  if (!text) throw new GeminiError('Gemini returned an empty response')
  return text
}

/** Maps a thrown error to an HTTP response the client can show directly. */
export function sendError(res: Res, e: unknown) {
  if (e instanceof GeminiError && e.rateLimited) {
    return res.status(429).json({ ok: false, error: 'rate_limit', message: RATE_LIMIT_MESSAGE })
  }
  console.error(e)
  return res.status(500).json({ ok: false, error: 'server_error', message: 'Something went wrong on the server.' })
}
