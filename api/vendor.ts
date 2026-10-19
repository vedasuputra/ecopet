import { COMMISSION_RATE, coupons } from '../src/data/coupons.js'
import { rest, supabaseConfigured, userFromToken } from './_supabase.js'
import type { Req, Res } from './_gemini.js'

// Vendor-only actions, all authenticated with the caller's Supabase access token:
//   register - claim a business listing and become a vendor account
//   lookup   - find an unredeemed coupon of MY business by QR payload or short code
//   redeem   - mark it redeemed, record the amount paid and the 5% commission
// Vendors cannot touch any other business's coupons.

const PLANS = ['monthly', 'semester', 'annual']
const MIN_AMOUNT = 1000
const MAX_AMOUNT = 50_000_000

interface IssuedRow {
  uid: string
  coupon_id: string
  vendor_id: string
  discount_pct: number
  source: string
  status: string
  issued_at: string
}

const fail = (res: Res, code: number, error: string) => res.status(code).json({ ok: false, error })

async function findCoupon(
  vendorId: string,
  raw: string,
): Promise<{ row: IssuedRow } | { error: 'not_found' | 'wrong_vendor' | 'already_used' | 'ambiguous' }> {
  const code = raw.trim()
  if (!code) return { error: 'not_found' }

  // 1) QR payload = the coupon uid
  const byUid = await rest(`coupons_issued?uid=eq.${encodeURIComponent(code)}&select=*`)
  const uidRows = byUid.ok ? ((await byUid.json()) as IssuedRow[]) : []
  if (uidRows.length) {
    const row = uidRows[0]
    if (row.vendor_id !== vendorId) return { error: 'wrong_vendor' }
    if (row.status === 'used') return { error: 'already_used' }
    return { row }
  }

  // 2) short code fallback, e.g. "SX15-4821" (coupon code + last 4 of the uid)
  const unused = await rest(`coupons_issued?vendor_id=eq.${encodeURIComponent(vendorId)}&status=eq.unused&select=*`)
  const rows = unused.ok ? ((await unused.json()) as IssuedRow[]) : []
  const matches = rows.filter((r) => {
    const c = coupons.find((x) => x.id === r.coupon_id)
    return c && `${c.code}-${r.uid.slice(-4)}`.toUpperCase() === code.toUpperCase()
  })
  if (matches.length === 1) return { row: matches[0] }
  return { error: matches.length > 1 ? 'ambiguous' : 'not_found' }
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed')
  if (!supabaseConfigured()) return fail(res, 500, 'not_configured')

  const auth = req.headers?.authorization
  const token = String(Array.isArray(auth) ? auth[0] : (auth ?? '')).replace(/^Bearer\s+/i, '')
  const user = await userFromToken(token)
  if (!user) return fail(res, 401, 'unauthorized')

  const { action, vendorId, plan, code, amountVnd } = req.body ?? {}

  // ---- register: claim an unclaimed business and become a vendor account
  if (action === 'register') {
    if (typeof vendorId !== 'string' || !PLANS.includes(plan)) return fail(res, 400, 'bad_request')
    const v = await rest(`vendors?id=eq.${encodeURIComponent(vendorId)}&select=id,owner_id`)
    const vendor = v.ok ? ((await v.json()) as { id: string; owner_id: string | null }[])[0] : undefined
    if (!vendor) return fail(res, 404, 'not_found')
    if (vendor.owner_id && vendor.owner_id !== user.id) return fail(res, 409, 'already_claimed')

    const upd = await rest(`vendors?id=eq.${encodeURIComponent(vendorId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ owner_id: user.id, plan, plan_started_at: new Date().toISOString() }),
    })
    if (!upd.ok) return fail(res, 500, 'db_error')

    const acc = await rest('accounts', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: user.id, role: 'vendor', vendor_id: vendorId }),
    })
    if (!acc.ok) return fail(res, 500, 'db_error')
    return res.json({ ok: true })
  }

  // ---- everything below needs a vendor account
  const a = await rest(`accounts?id=eq.${user.id}&select=role,vendor_id`)
  const account = a.ok ? ((await a.json()) as { role: string; vendor_id: string | null }[])[0] : undefined
  if (!account || account.role !== 'vendor' || !account.vendor_id) return fail(res, 403, 'not_a_vendor')
  const myVendor = account.vendor_id

  if (action === 'lookup' || action === 'redeem') {
    if (typeof code !== 'string') return fail(res, 400, 'bad_request')
    const found = await findCoupon(myVendor, code)
    if ('error' in found) return fail(res, found.error === 'not_found' ? 404 : 409, found.error)
    const { row } = found

    if (action === 'lookup') {
      return res.json({
        ok: true,
        coupon: {
          uid: row.uid,
          couponId: row.coupon_id,
          discountPct: row.discount_pct,
          source: row.source,
          issuedAt: row.issued_at,
        },
      })
    }

    const amount = Math.round(Number(amountVnd))
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) return fail(res, 400, 'bad_amount')
    const commission = Math.round(amount * COMMISSION_RATE)

    // status=eq.unused in the filter makes a double-scan race harmless: only one request updates the row
    const upd = await rest(`coupons_issued?uid=eq.${encodeURIComponent(row.uid)}&status=eq.unused`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'used',
        redeemed_at: new Date().toISOString(),
        amount_vnd: amount,
        commission_vnd: commission,
      }),
    })
    const updated = upd.ok ? ((await upd.json()) as unknown[]) : []
    if (!updated.length) return fail(res, 409, 'already_used')
    return res.json({ ok: true, amountVnd: amount, commissionVnd: commission })
  }

  return fail(res, 400, 'unknown_action')
}
