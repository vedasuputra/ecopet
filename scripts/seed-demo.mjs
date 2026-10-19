// Seeds the demo into Supabase and can be re-run any time to reset it.
//   npm run seed:demo
// Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (loaded with --env-file), and
// all three schema files (schema.sql, vendor_schema.sql, economy_schema.sql) run in Supabase.
// It is meant for YOUR OWN project; it deletes and recreates the @ecopet.demo accounts.
//
// Creates:
//   - a demo VENDOR account that owns "Cafe Sen Xanh" (v2): two coupons it defined itself, a paid
//     6-month plan, and 20 days of coupon history
//   - a demo TRAVELER account halfway through a trip: coins, two quests done, an unused v2 coupon
//   - 12 filler traveler accounts so "unique travelers" and the history look real
//   - coupon history for the other five businesses too, so any of them shows data once claimed
import { randomBytes } from 'node:crypto'
import { buildDemoState, DEMO_ECONOMY } from '../src/data/demoState.ts'

const URL_ = process.env.VITE_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !SVC) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: npm run seed:demo')
  process.exit(1)
}

const DOMAIN = '@ecopet.demo'
const PASSWORD = process.env.DEMO_PASSWORD || randomBytes(6).toString('base64url') + '-A1'
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const DAY = 86400000

// deterministic "random" so every run produces the same numbers
let seed = 20261020
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)

const rest = (path, init = {}) => fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } })
const rpc = (fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
const must = async (r, what) => {
  if (!r.ok) {
    console.error(`FAILED: ${what} (HTTP ${r.status}) ${await r.text()}`)
    if (r.status === 404) console.error('Hint: did you run supabase/economy_schema.sql in the SQL Editor?')
    process.exit(1)
  }
  return r
}

// ---- 1. wipe previous demo data (deleting the users cascades profiles, accounts, wallets, ledger, quests, coupons)
const list = await (await must(await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H }), 'list users')).json()
const old = (list.users ?? []).filter((u) => u.email?.endsWith(DOMAIN))
for (const u of old) await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: H })
await rest('vendor_payments?vendor_id=eq.v2', { method: 'DELETE' })
await rest('coupon_offers?id=eq.v2-combo', { method: 'DELETE' })
await rest('vendors?id=eq.v2', { method: 'PATCH', body: JSON.stringify({ owner_id: null, plan: 'monthly', plan_started_at: null, plan_paid_until: null }) })
console.log(`removed ${old.length} previous demo account(s)`)

// ---- 2. accounts
async function createUser(email, password, name) {
  const r = await must(
    await fetch(`${URL_}/auth/v1/admin/users`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
    }),
    `create ${email}`,
  )
  return (await r.json()).id
}

const vendorId = await createUser(`demo.vendor${DOMAIN}`, PASSWORD, 'Cafe Sen Xanh')
const travelerId = await createUser(`demo.traveler${DOMAIN}`, PASSWORD, 'Linh')
const fillers = []
for (let i = 1; i <= 12; i++) fillers.push(await createUser(`demo.t${i}${DOMAIN}`, randomBytes(9).toString('base64url') + '-A1', `Traveler ${i}`))

// the vendor account owns Cafe Sen Xanh, paid for the 6-month plan 20 days ago (simulated payment)
const paidAt = new Date(Date.now() - 20 * DAY)
const paidUntil = new Date(paidAt)
paidUntil.setMonth(paidUntil.getMonth() + 6)
await must(
  await rest('vendors?id=eq.v2', {
    method: 'PATCH',
    body: JSON.stringify({ owner_id: vendorId, plan: 'semester', plan_started_at: paidAt.toISOString(), plan_paid_until: paidUntil.toISOString() }),
  }),
  'claim v2',
)
await must(
  await rest('accounts', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: vendorId, role: 'vendor', vendor_id: 'v2' }),
  }),
  'vendor role',
)
await must(
  await rest('vendor_payments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      vendor_id: 'v2',
      plan: 'semester',
      amount_vnd: 1614600, // 1,794,000 minus the 10% new-vendor discount
      discount_vnd: 179400,
      method: 'momo',
      status: 'paid',
      period_start: paidAt.toISOString(),
      period_end: paidUntil.toISOString(),
      created_at: paidAt.toISOString(),
    }),
  }),
  'vendor payment',
)

// a second coupon, defined by the vendor itself (the first one, c2, comes from economy_schema.sql)
await must(
  await rest('coupon_offers', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 'v2-combo', vendor_id: 'v2', title_en: 'Coffee + pastry combo', title_vi: 'Combo cà phê + bánh', discount_pct: 20, cost_coins: 70, code: 'SC20', active: true }),
  }),
  'v2 combo offer',
)

// ---- 3. the demo traveler's server-side economy: profile (client part), wallet, quests, welcome gift
await must(
  await rest('profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: travelerId, state: buildDemoState('Linh'), updated_at: new Date().toISOString() }),
  }),
  'traveler profile',
)
const questReward = { q2: 30, q6: 20 }
for (const q of DEMO_ECONOMY.questsDone) await must(await rpc('complete_quest', { p_user: travelerId, p_quest: q, p_reward: questReward[q] ?? 20 }), `quest ${q}`)
const have = (await (await must(await rpc('apply_coins', { p_user: travelerId, p_delta: 0, p_reason: 'seed', p_ref: 'probe' }), 'wallet')).json())
if (DEMO_ECONOMY.coins > have) await must(await rpc('apply_coins', { p_user: travelerId, p_delta: DEMO_ECONOMY.coins - have, p_reason: 'seed', p_ref: 'demo' }), 'seed coins')
await must(await rest(`wallets?user_id=eq.${travelerId}`, { method: 'PATCH', body: JSON.stringify({ welcome_claimed: true }) }), 'welcome flag')

// ---- 4. coupon history (offer -> vendor mapping mirrors the seeded coupon_offers)
const OFFERS = [
  { vendor: 'v1', id: 'c1', pct: 10, n: 14 },
  { vendor: 'v2', id: 'c2', pct: 15, n: 36 },
  { vendor: 'v2', id: 'v2-combo', pct: 20, n: 11 },
  { vendor: 'v3', id: 'c3', pct: 20, n: 18 },
  { vendor: 'v4', id: 'c4', pct: 10, n: 8 },
  { vendor: 'v5', id: 'c5', pct: 25, n: 6 },
  { vendor: 'v6', id: 'c6', pct: 20, n: 10 },
]
const now = Date.now()
const rows = []
for (const o of OFFERS) {
  for (let i = 0; i < o.n; i++) {
    const daysAgo = Math.floor(14 * Math.pow(rnd(), 1.4)) // more recent days are busier
    const issued = new Date(now - daysAgo * DAY - Math.floor(rnd() * 12) * 3600000 - Math.floor(rnd() * 3600000))
    const used = rnd() < (daysAgo === 0 ? 0.35 : 0.68)
    const redeemedAt = used ? new Date(Math.min(now - 600000, issued.getTime() + (1 + rnd() * 30) * 3600000)) : null
    const amount = used ? Math.round((70000 + rnd() * 160000) / 1000) * 1000 : null
    rows.push({
      uid: `${o.id}-demo-${String(i + 1).padStart(4, '0')}`,
      user_id: fillers[Math.floor(rnd() * fillers.length)],
      coupon_id: o.id,
      vendor_id: o.vendor,
      discount_pct: o.pct,
      source: rnd() < 0.22 ? 'welcome' : 'coins',
      status: used ? 'used' : 'unused',
      issued_at: issued.toISOString(),
      redeemed_at: redeemedAt?.toISOString() ?? null,
      amount_vnd: amount,
      commission_vnd: amount ? Math.round(amount * 0.05) : null,
    })
  }
}
// the live-demo coupon: owned by the demo traveler, unused, scannable right away (short code SX15-9001)
rows.push({
  uid: `${DEMO_ECONOMY.couponId}-demo-9001`,
  user_id: travelerId,
  coupon_id: DEMO_ECONOMY.couponId,
  vendor_id: 'v2',
  discount_pct: 15,
  source: 'coins',
  status: 'unused',
  issued_at: new Date(now - 3600000).toISOString(),
  redeemed_at: null,
  amount_vnd: null,
  commission_vnd: null,
})
await must(await rest('coupons_issued', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }), 'coupon history')

// ---- 5. summary
const used = rows.filter((r) => r.status === 'used' && r.vendor_id === 'v2')
const sales = used.reduce((a, r) => a + r.amount_vnd, 0)
console.log(`\nseeded ${rows.length} coupon rows (${rows.filter((r) => r.vendor_id === 'v2').length} for Cafe Sen Xanh: ${used.length} redeemed, ${sales.toLocaleString('en-US')} VND in sales)`)
console.log('\n=== DEMO LOGINS ===')
console.log(`Vendor dashboard  ( /vendor/login ):  demo.vendor${DOMAIN}   /  ${PASSWORD}`)
console.log(`Traveler app      ( /login )       :  demo.traveler${DOMAIN}  /  ${PASSWORD}`)
console.log('Live scan demo: the traveler owns an unused Cafe Sen Xanh coupon, short code  SX15-9001')
