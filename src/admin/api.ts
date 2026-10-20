import { supabase } from '../lib/supabase'

export interface AdminResult {
  ok: boolean
  error?: string
  [k: string]: unknown
}

/** Calls /api/admin with the signed-in admin's token. The server re-checks the admin role every time. */
export async function adminApi(action: string, body: Record<string, unknown> = {}): Promise<AdminResult> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  try {
    const r = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ action, ...body }),
    })
    return await r.json()
  } catch {
    return { ok: false, error: 'unreachable' }
  }
}
