import { randomBytes } from 'node:crypto'
import { COMMISSION_RATE } from '../src/data/coupons.js'
import { parseOpenHours } from '../src/lib/openHours.js'
import { authedUser, loadQuests, rest, rpc, supabaseConfigured } from './_supabase.js'
import type { Req, Res } from './_gemini.js'

// Vendor-only actions, all authenticated with the caller's Supabase access token:
//   register     claim a listed business, or create a new one, and become a vendor account
//   lookup       find an unredeemed coupon of MY business by QR payload or short code
//   redeem       mark it redeemed, record the amount paid and the 5% commission, pay the traveler's bonus
//   coupon_save  create or edit one of MY coupons (the vendor sets title, discount and coin price)
//   profile_save set MY shop's address and opening hours
//   pay          SIMULATED subscription checkout: records a payment, no real money moves
// Vendors cannot touch any other business's data.

const PLANS = { monthly: { price: 349000, months: 1 }, semester: { price: 1794000, months: 6 }, annual: { price: 2988000, months: 12 } } as const
type PlanId = keyof typeof PLANS
const METHODS = ['momo', 'vnpay', 'zalopay', 'card']
const NEW_VENDOR_DISCOUNT = 0.1
const MIN_AMOUNT = 1000
const MAX_AMOUNT = 50_000_000
const MAX_OFFERS = 12
const REDEEM_BONUS_COINS = 10
const REDEEM_QUEST_ID = 'q8'
const REDEEM_QUEST_FALLBACK_REWARD = 25

interface IssuedRow {
  uid: string
  user_id: string
  coupon_id: string
  vendor_id: string
  discount_pct: number
  source: string
  status: string
  issued_at: string
  expires_at: string | null
}
const isExpired = (r: IssuedRow) => !!r.expires_at && new Date(r.expires_at) < new Date()
interface Offer {
  id: string
  vendor_id: string
  code: string
}

const fail = (res: Res, code: number, error: string) => res.status(code).json({ ok: false, error })
const getJson = async <T>(path: string): Promise<T[]> => {
  const r = await rest(path)
  return r.ok ? ((await r.json()) as T[]) : []
}
const str = (v: unknown, min: number, max: number) => (typeof v === 'string' && v.trim().length >= min && v.trim().length <= max ? v.trim() : null)

async function findCoupon(
  vendorId: string,
  raw: string,
): Promise<{ row: IssuedRow } | { error: 'not_found' | 'wrong_vendor' | 'already_used' | 'ambiguous' | 'expired' }> {
  const code = raw.trim()
  if (!code) return { error: 'not_found' }

  // 1) QR payload = the coupon uid
  const uidRows = await getJson<IssuedRow>(`coupons_issued?uid=eq.${encodeURIComponent(code)}&select=*`)
  if (uidRows.length) {
    const row = uidRows[0]
    if (row.vendor_id !== vendorId) return { error: 'wrong_vendor' }
    if (row.status === 'used') return { error: 'already_used' }
    if (isExpired(row)) return { error: 'expired' }
    return { row }
  }

  // 2) short code fallback, e.g. "SX15-4821" (the offer's code + last 4 of the uid)
  const offers = await getJson<Offer>(`coupon_offers?vendor_id=eq.${encodeURIComponent(vendorId)}&select=id,code,vendor_id`)
  const codeOf = new Map(offers.map((o) => [o.id, o.code]))
  const all = await getJson<IssuedRow>(`coupons_issued?vendor_id=eq.${encodeURIComponent(vendorId)}&select=*&limit=5000`)
  const matches = all.filter((r) => `${codeOf.get(r.coupon_id) ?? ''}-${r.uid.slice(-4)}`.toUpperCase() === code.toUpperCase())
  const unused = matches.filter((r) => r.status === 'unused')
  const live = unused.filter((r) => !isExpired(r))
  if (live.length === 1) return { row: live[0] }
  if (live.length > 1) return { error: 'ambiguous' }
  if (unused.length) return { error: 'expired' } // only expired ones match
  // nothing unused matches: tell the vendor if it is a coupon that was already redeemed
  return { error: matches.length ? 'already_used' : 'not_found' }
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed')
  if (!supabaseConfigured()) return fail(res, 500, 'not_configured')

  const user = await authedUser(req)
  if (!user) return fail(res, 401, 'unauthorized')

  const body = req.body ?? {}
  const { action } = body

  // ---- register: claim a listed business, or create a new one
  if (action === 'register') {
    const plan = body.plan as PlanId
    if (!(plan in PLANS)) return fail(res, 400, 'bad_request')

    let vendorId: string
    if (body.newBusiness) {
      const nb = body.newBusiness
      const name = str(nb.name, 2, 60)
      const categoryEn = str(nb.categoryEn, 2, 40)
      const categoryVi = str(nb.categoryVi, 2, 40)
      const lat = Number(nb.lat)
      const lng = Number(nb.lng)
      if (!name || !categoryEn || !categoryVi || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return fail(res, 400, 'bad_business')
      }
      vendorId = `v-${randomBytes(4).toString('hex')}`
      const ins = await rest('vendors', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ id: vendorId, name, category_en: categoryEn, category_vi: categoryVi, lat, lng, plan, owner_id: user.id }),
      })
      if (!ins.ok) return fail(res, 500, 'db_error')
    } else {
      if (typeof body.vendorId !== 'string') return fail(res, 400, 'bad_request')
      vendorId = body.vendorId
      const vendor = (await getJson<{ id: string; owner_id: string | null }>(`vendors?id=eq.${encodeURIComponent(vendorId)}&select=id,owner_id`))[0]
      if (!vendor) return fail(res, 404, 'not_found')
      if (vendor.owner_id && vendor.owner_id !== user.id) return fail(res, 409, 'already_claimed')
      const upd = await rest(`vendors?id=eq.${encodeURIComponent(vendorId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ owner_id: user.id, plan, plan_paid_until: null, plan_started_at: null }), // a claimed shop must pay before it shows to travelers
      })
      if (!upd.ok) return fail(res, 500, 'db_error')
    }

    const acc = await rest('accounts', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: user.id, role: 'vendor', vendor_id: vendorId }),
    })
    if (!acc.ok) return fail(res, 500, 'db_error')
    return res.json({ ok: true, vendorId })
  }

  // ---- everything below needs a vendor account
  const account = (await getJson<{ role: string; vendor_id: string | null }>(`accounts?id=eq.${user.id}&select=role,vendor_id`))[0]
  if (!account || account.role !== 'vendor' || !account.vendor_id) return fail(res, 403, 'not_a_vendor')
  const myVendor = account.vendor_id

  if (action === 'lookup' || action === 'redeem') {
    if (typeof body.code !== 'string') return fail(res, 400, 'bad_request')
    const found = await findCoupon(myVendor, body.code)
    if ('error' in found) return fail(res, found.error === 'not_found' ? 404 : 409, found.error)
    const { row } = found

    if (action === 'lookup') {
      return res.json({
        ok: true,
        coupon: { uid: row.uid, couponId: row.coupon_id, discountPct: row.discount_pct, source: row.source, issuedAt: row.issued_at },
      })
    }

    const amount = Math.round(Number(body.amountVnd))
    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) return fail(res, 400, 'bad_amount')
    const commission = Math.round(amount * COMMISSION_RATE)

    // status=eq.unused in the filter makes a double-scan race harmless: only one request updates the row
    const upd = await rest(`coupons_issued?uid=eq.${encodeURIComponent(row.uid)}&status=eq.unused`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'used', redeemed_at: new Date().toISOString(), amount_vnd: amount, commission_vnd: commission }),
    })
    const updated = upd.ok ? ((await upd.json()) as unknown[]) : []
    if (!updated.length) return fail(res, 409, 'already_used')

    // The traveler's reward for using a coupon: bonus coins, plus the "redeem a coupon" quest (once).
    await rpc('apply_coins', { p_user: row.user_id, p_delta: REDEEM_BONUS_COINS, p_reason: 'redeem_bonus', p_ref: row.uid })
    const redeemQuest = (await loadQuests()).find((q) => q.id === REDEEM_QUEST_ID)
    await rpc('complete_quest', { p_user: row.user_id, p_quest: REDEEM_QUEST_ID, p_reward: redeemQuest?.rewardCoins ?? REDEEM_QUEST_FALLBACK_REWARD })
    return res.json({ ok: true, amountVnd: amount, commissionVnd: commission })
  }

  // ---- coupon_save: the vendor defines the coupon (title, discount, coin price)
  if (action === 'coupon_save') {
    const titleEn = str(body.titleEn, 2, 60)
    const titleVi = str(body.titleVi, 2, 60)
    const discount = Math.round(Number(body.discountPct))
    const cost = Math.round(Number(body.costCoins))
    const validDays = body.validDays === undefined || body.validDays === '' ? 30 : Math.round(Number(body.validDays))
    const monthlyCap = body.monthlyCap === undefined || body.monthlyCap === null || body.monthlyCap === '' ? null : Math.round(Number(body.monthlyCap))
    if (
      !titleEn || !titleVi || !(discount >= 1 && discount <= 50) || !(cost >= 10 && cost <= 500) ||
      !(validDays >= 1 && validDays <= 365) || (monthlyCap !== null && !(monthlyCap >= 1 && monthlyCap <= 10000))
    ) {
      return fail(res, 400, 'bad_input')
    }

    const mine = await getJson<Offer>(`coupon_offers?vendor_id=eq.${encodeURIComponent(myVendor)}&select=id,code,vendor_id`)
    let id = typeof body.id === 'string' ? body.id : ''
    if (id) {
      if (!mine.some((o) => o.id === id)) return fail(res, 403, 'not_yours') // cannot edit someone else's coupon
    } else {
      if (mine.length >= MAX_OFFERS) return fail(res, 409, 'too_many_offers')
      id = `${myVendor}-${randomBytes(3).toString('hex')}`
    }

    let code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!code) {
      // generate: two letters from the id + discount, e.g. "AB15", made unique among this vendor's coupons
      const base = `${id.replace(/[^A-Z0-9]/gi, '').slice(0, 2)}${discount}`.toUpperCase()
      code = base
      for (let n = 2; mine.some((o) => o.id !== id && o.code === code) && n < 50; n++) code = `${base}${n}`
    }
    if (!/^[A-Z0-9]{2,8}$/.test(code)) return fail(res, 400, 'bad_input')
    if (mine.some((o) => o.id !== id && o.code === code)) return fail(res, 409, 'code_taken')

    const active = body.active !== false
    const up = await rest('coupon_offers', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ id, vendor_id: myVendor, title_en: titleEn, title_vi: titleVi, discount_pct: discount, cost_coins: cost, code, active, valid_days: validDays, monthly_cap: monthlyCap }),
    })
    if (!up.ok) return fail(res, up.status === 409 ? 409 : 500, up.status === 409 ? 'code_taken' : 'db_error')
    return res.json({ ok: true, id, code })
  }

  // ---- profile_save: the shop's address and opening hours, shown to travelers on the coupon page
  if (action === 'profile_save') {
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    if (address.length > 120) return fail(res, 400, 'bad_input')
    const hours = body.openHours === null ? null : parseOpenHours(body.openHours)
    if (body.openHours !== null && !hours) return fail(res, 400, 'bad_input')
    const upd = await rest(`vendors?id=eq.${encodeURIComponent(myVendor)}`, {
      method: 'PATCH',
      body: JSON.stringify({ address: address || null, open_hours: hours }),
    })
    if (!upd.ok) return fail(res, 500, 'db_error')
    return res.json({ ok: true })
  }

  // ---- pay: SIMULATED checkout. Records the payment and extends the plan; no money moves.
  if (action === 'pay') {
    const plan = body.plan as PlanId
    if (!(plan in PLANS) || !METHODS.includes(body.method)) return fail(res, 400, 'bad_request')

    const prior = await getJson<{ id: number }>(`vendor_payments?vendor_id=eq.${encodeURIComponent(myVendor)}&select=id&limit=1`)
    const price = PLANS[plan].price
    const discount = prior.length ? 0 : Math.round(price * NEW_VENDOR_DISCOUNT) // new-vendor discount: first payment only
    const vendor = (await getJson<{ plan_paid_until: string | null }>(`vendors?id=eq.${encodeURIComponent(myVendor)}&select=plan_paid_until`))[0]

    // a renewal starts when the current period ends; otherwise now
    const now = new Date()
    const start = vendor?.plan_paid_until && new Date(vendor.plan_paid_until) > now ? new Date(vendor.plan_paid_until) : now
    const end = new Date(start)
    end.setMonth(end.getMonth() + PLANS[plan].months)

    const ins = await rest('vendor_payments', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        vendor_id: myVendor,
        plan,
        amount_vnd: price - discount,
        discount_vnd: discount,
        method: body.method,
        status: 'paid',
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      }),
    })
    const payment = ins.ok ? ((await ins.json()) as { id: number }[])[0] : undefined
    if (!payment) return fail(res, 500, 'db_error')

    const upd = await rest(`vendors?id=eq.${encodeURIComponent(myVendor)}`, {
      method: 'PATCH',
      body: JSON.stringify({ plan, plan_started_at: start.toISOString(), plan_paid_until: end.toISOString() }),
    })
    if (!upd.ok) return fail(res, 500, 'db_error')
    return res.json({ ok: true, payment, paidUntil: end.toISOString() })
  }

  return fail(res, 400, 'unknown_action')
}
