import type { Req, Res } from './_gemini.js'
import { apiHit, authedUser, getJsonRows, rest, supabaseConfigured } from './_supabase.js'

// Customer service. A traveler reports a problem (a shop that was closed although it said it was open, a coupon the shop would not
// take, ...). The report is stored for the team, who answer it from the admin page (coins back, more days on the coupon, or a note).
//   create  a new report. Safeguards: signed in; the coupon must be the traveler's own; one open report per coupon; a text of
//           10 - 500 characters (so nobody sends an empty complaint); and a rate limit so nobody can flood the team.
//   mine    the traveler's own reports and the answers to them

export const SUPPORT_CATEGORIES = ['shop_closed', 'shop_refused', 'wrong_deal', 'coupon_problem', 'coins_problem', 'other']
// these are about a coupon, so a coupon has to be chosen
const NEEDS_COUPON = ['shop_closed', 'shop_refused', 'wrong_deal', 'coupon_problem']

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
const PER_MINUTE = num(process.env.SUPPORT_PER_MINUTE, 2)
const PER_DAY = num(process.env.SUPPORT_PER_DAY, 5)
const GLOBAL_PER_DAY = num(process.env.SUPPORT_GLOBAL_PER_DAY, 300)

const fail = (res: Res, code: number, error: string) => res.status(code).json({ ok: false, error })

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed')
  if (!supabaseConfigured()) return fail(res, 500, 'not_configured')
  const user = await authedUser(req)
  if (!user) return fail(res, 401, 'unauthorized')

  const { action, category, couponUid, message } = req.body ?? {}

  if (action === 'mine') {
    const items = await getJsonRows(
      `support_tickets?user_id=eq.${user.id}&select=id,category,coupon_uid,coupon_id,vendor_id,message,status,resolution,refunded_coins,admin_note,created_at,resolved_at&order=created_at.desc&limit=30`,
    )
    return res.json({ ok: true, items })
  }

  if (action === 'create') {
    const text = typeof message === 'string' ? message.trim() : ''
    if (typeof category !== 'string' || !SUPPORT_CATEGORIES.includes(category) || text.length < 10 || text.length > 500) return fail(res, 400, 'bad_request')
    const hasCoupon = typeof couponUid === 'string' && couponUid.length > 0 && couponUid.length < 100
    if (NEEDS_COUPON.includes(category) && !hasCoupon) return fail(res, 400, 'coupon_required')

    let couponId: string | null = null
    let vendorId: string | null = null
    if (hasCoupon) {
      const row = (
        await getJsonRows<{ coupon_id: string; vendor_id: string }>(
          `coupons_issued?uid=eq.${encodeURIComponent(couponUid)}&user_id=eq.${user.id}&select=coupon_id,vendor_id`,
        )
      )[0]
      if (!row) return fail(res, 404, 'coupon_not_found') // it has to be the traveler's own coupon
      couponId = row.coupon_id
      vendorId = row.vendor_id
      const open = await getJsonRows(`support_tickets?user_id=eq.${user.id}&coupon_uid=eq.${encodeURIComponent(couponUid)}&status=eq.open&select=id&limit=1`)
      if (open.length) return fail(res, 409, 'already_open')
    }

    const hit = await apiHit(user.id, 'support', PER_MINUTE, PER_DAY, GLOBAL_PER_DAY)
    if (!hit.ok) return hit.reason === 'unavailable' ? fail(res, 500, 'server_error') : fail(res, 429, 'support_limit')

    const ins = await rest('support_tickets', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, category, coupon_uid: hasCoupon ? couponUid : null, coupon_id: couponId, vendor_id: vendorId, message: text }),
    })
    if (!ins.ok) return fail(res, 500, 'db_error')
    return res.json({ ok: true })
  }

  return fail(res, 400, 'unknown_action')
}
