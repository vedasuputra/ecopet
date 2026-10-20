import type { Key } from '../i18n'
import { supabase } from '../lib/supabase'

export interface VendorApiResult {
  ok: boolean
  error?: string
  [k: string]: unknown
}

/** Calls /api/vendor with the signed-in user's access token. Never throws. */
export async function vendorApi(action: string, body: Record<string, unknown> = {}): Promise<VendorApiResult> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token
  try {
    const r = await fetch('/api/vendor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ action, ...body }),
    })
    return await r.json()
  } catch {
    return { ok: false, error: 'unreachable' }
  }
}

/** Server error code -> translation key. */
export function errorKey(code: string | undefined): Key {
  switch (code) {
    case 'not_found':
      return 'vErrNotFound'
    case 'wrong_vendor':
      return 'vErrWrongVendor'
    case 'already_used':
      return 'vErrUsed'
    case 'ambiguous':
      return 'vErrAmbiguous'
    case 'expired':
      return 'vErrExpired'
    case 'bad_amount':
      return 'vErrAmount'
    case 'already_claimed':
      return 'vErrAlreadyClaimed'
    case 'unreachable':
      return 'vErrServer'
    default:
      return 'vErrGeneric'
  }
}
