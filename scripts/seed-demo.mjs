// Seeds the demo into Supabase and can be re-run any time to reset it.
//   npm run seed:demo
// Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (loaded with --env-file), and
// all schema files run in Supabase (schema, vendor_schema, economy_schema, limits_schema, quests_and_expiry_schema).
// It is meant for YOUR OWN project; it deletes and recreates the @ecopet.demo accounts.
//
// Creates:
//   - a demo VENDOR account that owns "Cafe Sen Xanh" (v2): two coupons it defined itself (one valid 14 days with a
//     monthly limit of 40), a paid
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
const PASSWORD = process.env.DEMO_PASSWORD || 'ecopet' // the demo accounts all use this password (change it with DEMO_PASSWORD)
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
    body: JSON.stringify({ id: 'v2-combo', vendor_id: 'v2', title_en: 'Coffee + pastry combo', title_vi: 'Combo cà phê + bánh', discount_pct: 20, cost_coins: 150, code: 'SC20', active: true, valid_days: 7, monthly_cap: 40 }),
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
  { vendor: 'v2', id: 'v2-combo', pct: 20, n: 11, validDays: 7 }, // a coupon is valid 7 days at most: some of these have expired
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
      expires_at: new Date(issued.getTime() + (o.validDays ?? 30) * DAY).toISOString(),
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
  expires_at: new Date(now + 30 * DAY).toISOString(),
  redeemed_at: null,
  amount_vnd: null,
  commission_vnd: null,
})
await must(await rest('coupons_issued', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }), 'coupon history')

// ---- 4b. the STORY demo traveler: Rani, 7 days in the Delta, many quests done, several coupons used, ready to share the trip story.
// The "bring your own bottle" quest (q6) is left untouched on purpose, so it can be completed live during the demo.
const raniId = await createUser(`demo.rani${DOMAIN}`, PASSWORD, 'Rani')
const RANI_DAYS = 7
const RANI_PLACES = ['Can Tho', 'Cai Rang Floating Market', 'Vinh Long', 'Ben Tre', 'My Tho']
const raniState = {
  user: { name: 'Rani', origin: 'international', days: RANI_DAYS, destinations: RANI_PLACES, tripStart: new Date(now - 4 * DAY).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) },
  activeQuestIds: ['q3', 'q14', 'q16', 'q23', 'q6'],
  pinnedQuestIds: ['q6', 'q16'],
  chatHistory: [],
}
await must(
  await rest('profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: raniId, state: raniState, traveler_type: 'international', updated_at: new Date().toISOString() }),
  }),
  'rani profile',
)
// quests (q6 is NOT in the list), with the reward each one pays; spread over the last 4 days
const RANI_QUESTS = [['q1', 30], ['q2', 25], ['q5', 20], ['q7', 10], ['q8', 15], ['q9', 30], ['q10', 40], ['q12', 30], ['q4', 30], ['q15', 25], ['q20', 35]]
for (const [q, reward] of RANI_QUESTS) await must(await rpc('complete_quest', { p_user: raniId, p_quest: q, p_reward: reward }), `rani quest ${q}`)
for (const [i, [q]] of RANI_QUESTS.entries()) {
  const when = new Date(now - (4 - Math.floor((i * 4) / RANI_QUESTS.length)) * DAY - i * 2400000).toISOString()
  await rest(`quest_progress?user_id=eq.${raniId}&quest_id=eq.${q}`, { method: 'PATCH', body: JSON.stringify({ completed_at: when }) })
}
// coins: she earned the rewards above and spent some on the coupons below; the rest is left in her wallet
await must(await rpc('apply_coins', { p_user: raniId, p_delta: 400, p_reason: 'seed', p_ref: 'rani-start' }), 'rani coins')
await must(await rest(`wallets?user_id=eq.${raniId}`, { method: 'PATCH', body: JSON.stringify({ welcome_claimed: true }) }), 'rani welcome flag')
// six coupons bought with coins and USED at six different local shops, and one still unused
const RANI_COUPONS = [
  ['c1', 'v1', 10, 75, 6, 185000],
  ['c2', 'v2', 15, 95, 5, 142000],
  ['c3', 'v3', 20, 115, 4, 236000],
  ['c4', 'v4', 10, 85, 3, 98000],
  ['c6', 'v6', 20, 105, 2, 210000],
  ['c7', 'v7', 15, 85, 1, 124000],
]
const raniRows = []
for (const [id, vendor, pct, cost, daysAgo, amount] of RANI_COUPONS) {
  const uid = `${id}-rani-${daysAgo}`
  await must(await rpc('apply_coins', { p_user: raniId, p_delta: -cost, p_reason: 'coupon', p_ref: uid }), `rani buys ${id}`)
  const issued = new Date(now - daysAgo * DAY - 5 * 3600000)
  raniRows.push({
    uid,
    user_id: raniId,
    coupon_id: id,
    vendor_id: vendor,
    discount_pct: pct,
    source: 'coins',
    status: 'used',
    issued_at: issued.toISOString(),
    expires_at: new Date(issued.getTime() + 7 * DAY).toISOString(),
    redeemed_at: new Date(issued.getTime() + 3 * 3600000).toISOString(),
    amount_vnd: amount,
    commission_vnd: Math.round(amount * 0.05),
  })
}
raniRows.push({
  uid: 'c5-rani-unused',
  user_id: raniId,
  coupon_id: 'c5',
  vendor_id: 'v5',
  discount_pct: 25,
  source: 'coins',
  status: 'unused',
  issued_at: new Date(now - 3600000).toISOString(),
  expires_at: new Date(now + 6 * DAY).toISOString(),
  redeemed_at: null,
  amount_vnd: null,
  commission_vnd: null,
})
await must(await rest('coupons_issued', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(raniRows) }), 'rani coupons')
// her referral code, used by two of the filler travelers (they get 20 coins, she gets a voucher for each); skipped (with a note) if referral_schema.sql was not run yet
const codeRes = await rpc('get_referral_code', { p_user: raniId })
let raniCode = '(run supabase/referral_schema.sql)'
if (codeRes.ok) {
  raniCode = await codeRes.json()
  for (const [i, f] of fillers.slice(0, 2).entries()) {
    const r = await rpc('apply_referral', { p_user: f, p_code: raniCode, p_voucher_uid: `ref-rani-${i + 1}` })
    if (!r.ok) console.warn('referral demo skipped:', (await r.text()).slice(0, 120))
  }
}

// ---- 5. summary
const used = rows.filter((r) => r.status === 'used' && r.vendor_id === 'v2')
const sales = used.reduce((a, r) => a + r.amount_vnd, 0)
console.log(`\nseeded ${rows.length} coupon rows (${rows.filter((r) => r.vendor_id === 'v2').length} for Cafe Sen Xanh: ${used.length} redeemed, ${sales.toLocaleString('en-US')} VND in sales)`)
console.log('\n=== DEMO LOGINS ===')
console.log(`Vendor dashboard  ( /vendor/login ):  demo.vendor${DOMAIN}   /  ${PASSWORD}`)
console.log(`Traveler app      ( /login )       :  demo.traveler${DOMAIN}  /  ${PASSWORD}`)
console.log(`Story demo traveler ( /login ):  demo.rani${DOMAIN}  /  ${PASSWORD}   (7 days, ${RANI_QUESTS.length} quests done, ${RANI_COUPONS.length} coupons used, referral code ${raniCode}; the own-bottle quest q6 is untouched)`)
console.log('Live scan demo: the traveler owns an unused Cafe Sen Xanh coupon, short code  SX15-9001')

// the extra demo accounts (more travelers, a second vendor, the team)
await import('./demo-accounts.mjs')
console.log(`Second story traveler ( /login ):  demo.hana${DOMAIN}  /  ${PASSWORD}   (7 days on the western route, last day today; the utensils quest q7 is untouched)`)
console.log(`More travelers ( /login ):  demo.minh${DOMAIN}, demo.sophie${DOMAIN}  /  ${PASSWORD}`)
console.log(`Second vendor ( /vendor/login ):  demo.vendor2${DOMAIN}  /  ${PASSWORD}   (Banh Xeo Co Lan)`)
console.log(`Team dashboard ( /admin ):  demo.admin${DOMAIN}, demo.admin2${DOMAIN}  /  ${PASSWORD}`)
