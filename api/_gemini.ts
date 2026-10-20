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

// Project decision: always use Gemini 3.1 Flash Lite, no fallback model.
const MODEL = 'gemini-3.1-flash-lite'

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

  const send = () =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
    })
  let r = await send()
  // 503 means the model is busy for a moment (not that the quota is used up): one more try a second later
  if (r.status === 503) {
    await new Promise((res) => setTimeout(res, 1200))
    r = await send()
  }
  if (r.status === 429 || r.status === 503) {
    // the real reason (which quota, how long to wait) is in the body: it is written to the server log, never sent to the client
    console.error(`[gemini] ${r.status}`, (await r.text().catch(() => '')).slice(0, 400))
    throw new GeminiError(RATE_LIMIT_MESSAGE, true)
  }
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
