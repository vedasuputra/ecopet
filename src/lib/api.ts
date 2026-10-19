// Thin client for the serverless functions in /api (Gemini key stays on the server).
// Locally these only exist under `npx vercel dev`; plain `npm run dev` will 404.

export interface ApiResult {
  ok: boolean
  message?: string
  error?: string
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
    return {
      ok: false,
      error: 'unreachable',
      message: 'Server tidak terjangkau. Jalankan lewat "npx vercel dev" atau buka versi yang sudah di-deploy.',
    }
  }
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
  activeQuests: string[]
  language?: string
}) => post('/api/chat', p)
