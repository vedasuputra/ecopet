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
