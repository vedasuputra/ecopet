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

  // Gemini is sometimes slow (10 s or more for a small request) or busy. So the backup model is not waited for until the first one has failed:
// if the first model has not answered after 12 s, or answers 503 / 429 / nothing, the backup is asked too, and the first good answer wins
// (the other call is cancelled). A call is given up after 40 s, so the platform never has to cut the whole function (60 s).
  const r = await new Promise<Response>((resolve, reject) => {
    const ctrls = [new AbortController(), new AbortController()]
    let pending = 0
    let backupStarted = false
    let done = false
    let busy = false // some call was busy, over quota or too slow
    let lastError = ''
    const start = (i: number, model: string) => {
      pending++
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([ctrls[i].signal, AbortSignal.timeout(40_000)]),
      })
        .then(async (res) => {
          if (res.ok) return finish(res, i)
          const body = (await res.text().catch(() => '')).slice(0, 300)
          // the real reason (which quota, how long to wait) goes to the server log, never to the client
          console.error(`[gemini] ${model} ${res.status}`, body)
          if (res.status === 429 || res.status === 503) busy = true
          else lastError = `Gemini ${res.status}: ${body.slice(0, 200)}`
          failed(i)
        })
        .catch((e: Error) => {
          if (done) return // the call that lost the race was cancelled
          console.error(`[gemini] ${model}: no answer in time`, e.name)
          busy = true
          failed(i)
        })
    }
    const startBackup = () => {
      if (backupStarted || done) return
      backupStarted = true
      start(1, BACKUP_MODEL)
    }
    const timer = setTimeout(startBackup, 12_000)
    const finish = (res: Response, winner: number) => {
      if (done) return
      done = true
      clearTimeout(timer)
      ctrls.forEach((c, j) => j !== winner && c.abort())
      resolve(res)
    }
    const failed = (i: number) => {
      pending--
      if (done) return
      if (i === 0) startBackup() // the first model failed: the backup is asked now
      if (pending === 0 && backupStarted) {
        done = true
        clearTimeout(timer)
        reject(busy ? new GeminiError(RATE_LIMIT_MESSAGE, true) : new GeminiError(lastError || 'Gemini failed'))
      }
    }
    start(0, MODEL)
  })

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
