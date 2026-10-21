// Makes sure the extra demo sign-in accounts exist (all with the demo password), without touching anything else. Safe to run again:
// accounts that exist are kept (their password and role are set again). Also run at the end of `npm run seed:demo`.
//   npm run seed:accounts
// Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (loaded with --env-file).
//
// Ensures:
//   - travelers  demo.minh (domestic) and demo.sophie (international), next to demo.traveler (Linh) and demo.rani from seed-demo
//   - a second vendor, demo.vendor2, owning "Banh Xeo Co Lan" (v3) with a paid monthly plan
//   - two team (admin) accounts: demo.admin and demo.admin2

const URL_ = process.env.VITE_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !SVC) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: npm run seed:accounts')
  process.exit(1)
}
const DOMAIN = '@ecopet.demo'
const PASSWORD = process.env.DEMO_PASSWORD || 'ecopet'
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
const rest = (path, init = {}) => fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } })
const must = async (r, what) => {
  if (!r.ok) {
    console.error(`FAILED: ${what} (HTTP ${r.status}) ${await r.text()}`)
    process.exit(1)
  }
  return r
}

const existing = (await (await must(await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H }), 'list users')).json()).users ?? []

/** The account with this email: created if missing, otherwise its password and name are set again. Returns its id. */
async function ensureUser(local, name) {
  const email = `${local}${DOMAIN}`
  const found = existing.find((u) => u.email === email)
  if (found) {
    await must(
      await fetch(`${URL_}/auth/v1/admin/users/${found.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ password: PASSWORD, user_metadata: { name } }) }),
      `update ${email}`,
    )
    return found.id
  }
  const r = await must(
    await fetch(`${URL_}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { name } }) }),
    `create ${email}`,
  )
  return (await r.json()).id
}
const setRole = async (id, role, vendorId = null) =>
  must(
    await rest('accounts', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id, role, vendor_id: vendorId }) }),
    `role ${role}`,
  )

// ---- travelers
await ensureUser('demo.minh', 'Minh')
await ensureUser('demo.sophie', 'Sophie')

// ---- second vendor: Banh Xeo Co Lan (v3), monthly plan paid today (simulated)
const v2Id = await ensureUser('demo.vendor2', 'Banh Xeo Co Lan')
await setRole(v2Id, 'vendor', 'v3')
const v3 = (await (await rest('vendors?id=eq.v3&select=plan_paid_until')).json())[0]
if (!v3?.plan_paid_until || new Date(v3.plan_paid_until) < new Date()) {
  const start = new Date()
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  await must(
    await rest('vendors?id=eq.v3', { method: 'PATCH', body: JSON.stringify({ owner_id: v2Id, plan: 'monthly', plan_started_at: start.toISOString(), plan_paid_until: end.toISOString() }) }),
    'claim v3',
  )
  const paid = (await (await rest('vendor_payments?vendor_id=eq.v3&select=id&limit=1')).json()).length > 0
  await must(
    await rest('vendor_payments', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        vendor_id: 'v3',
        plan: 'monthly',
        amount_vnd: paid ? 349000 : 314100, // the first payment has the 10% new-vendor discount
        discount_vnd: paid ? 0 : 34900,
        method: 'zalopay',
        status: 'paid',
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      }),
    }),
    'v3 payment',
  )
} else {
  await must(await rest('vendors?id=eq.v3', { method: 'PATCH', body: JSON.stringify({ owner_id: v2Id }) }), 'claim v3')
}

// ---- the Eco-Pet team
await setRole(await ensureUser('demo.admin', 'Eco-Pet Team'), 'admin')
await setRole(await ensureUser('demo.admin2', 'Eco-Pet Support'), 'admin')

// ---- one photo waiting in the admin review queue, sent by Sophie for the own-bottle quest. Its image is broken on purpose (a JPEG
// cut off after its first bytes), to show how the queue handles a damaged photo. Only added when Sophie has nothing pending.
const sophie = (await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H })).json()).users.find((u) => u.email === `demo.sophie${DOMAIN}`)
const pending = (await (await rest(`verification_attempts?user_id=eq.${sophie.id}&review_status=eq.pending&select=id`)).json()).length
if (!pending) {
  await must(
    await rest('verification_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: sophie.id,
        quest_id: 'q6',
        outcome: 'review',
        reason: 'low_confidence',
        confidence: 0.41,
        quest_met: null,
        red_flags: ['image partly unreadable'],
        ai_reason: 'Part of the photo could not be read. Something like a bottle may be in the lower half, but it is not clear.',
        distance_m: 40,
        review_image: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL',
        review_status: 'pending',
      }),
    }),
    'review queue entry',
  )
}

// ---- a second STORY traveler, like Rani but on the western route: Hana, 7 days (Can Tho, Sa Dec, Chau Doc, Tra Su), on the last
// day of her trip. Quests done on every one of the 7 days, five coupons used at five shops, one still unused, a referral code used
// by two friends, and a line in the photo-check log for each quest. "Bring your own utensils" (q7) is left untouched for a live demo.
// She is recreated from scratch on every run.
{
  const DAY = 86400000
  const now = Date.now()
  const old = existing.find((u) => u.email === `demo.hana${DOMAIN}`)
  if (old) await fetch(`${URL_}/auth/v1/admin/users/${old.id}`, { method: 'DELETE', headers: H }) // cascades her profile, wallet, quests, coupons
  const r = await must(
    await fetch(`${URL_}/auth/v1/admin/users`, { method: 'POST', headers: H, body: JSON.stringify({ email: `demo.hana${DOMAIN}`, password: PASSWORD, email_confirm: true, user_metadata: { name: 'Hana' } }) }),
    'create demo.hana',
  )
  const hanaId = (await r.json()).id
  const rpc = (fn, args) => rest(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
  const day = (n) => new Date(now - n * DAY).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })

  await must(
    await rest('profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: hanaId,
        state: {
          user: { name: 'Hana', origin: 'international', days: 7, destinations: ['Can Tho', 'Sa Dec', 'Chau Doc', 'Tra Su'], tripStart: day(6) },
          activeQuestIds: ['q7', 'q19', 'q21', 'q22'],
          pinnedQuestIds: ['q7'],
          chatHistory: [],
        },
        traveler_type: 'international',
        updated_at: new Date().toISOString(),
      }),
    }),
    'hana profile',
  )

  // [quest, reward, days ago, hour of the day]: two a day on average, from the first day (6 days ago) to today
  const QUESTS = [
    ['q2', 25, 6, 9], ['q5', 20, 6, 15], ['q11', 30, 5, 7], ['q13', 30, 5, 11],
    ['q6', 10, 4, 10], ['q23', 30, 4, 14], ['q25', 25, 4, 19], ['q24', 25, 3, 8],
    ['q26', 30, 2, 9], ['q27', 30, 2, 16], ['q28', 40, 1, 6], ['q8', 15, 1, 13],
    ['q3', 40, 0, 8], ['q16', 35, 0, 10], ['q17', 25, 0, 12],
  ]
  const at = (daysAgo, hour) => {
    const d = new Date(now - daysAgo * DAY)
    d.setUTCHours(hour - 7, Math.floor(Math.random() * 50), 0, 0) // Vietnam time
    return Math.min(d.getTime(), now - 30 * 60000)
  }
  for (const [q, reward] of QUESTS) await must(await rpc('complete_quest', { p_user: hanaId, p_quest: q, p_reward: reward }), `hana quest ${q}`)
  for (const [q, , daysAgo, hour] of QUESTS) {
    await rest(`quest_progress?user_id=eq.${hanaId}&quest_id=eq.${q}`, { method: 'PATCH', body: JSON.stringify({ completed_at: new Date(at(daysAgo, hour)).toISOString() }) })
  }
  // the photo checks behind those quests, so they show in the team's "All verifications"
  await rest('verification_attempts', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(
      QUESTS.map(([q, , daysAgo, hour], i) => ({
        user_id: hanaId,
        quest_id: q,
        outcome: 'verified',
        reason: 'verified',
        confidence: Math.round((0.78 + ((i * 7) % 18) / 100) * 100) / 100,
        quest_met: true,
        red_flags: [],
        ai_reason: 'The photo clearly shows what the quest asks for.',
        distance_m: ['q5', 'q6', 'q8'].includes(q) ? null : 20 + ((i * 37) % 160),
        created_at: new Date(at(daysAgo, hour) - 60000).toISOString(),
      })),
    ),
  })

  // coins: the quest rewards plus a starting balance, minus the coupons below
  await must(await rpc('apply_coins', { p_user: hanaId, p_delta: 400, p_reason: 'seed', p_ref: 'hana-start' }), 'hana coins')
  await must(await rest(`wallets?user_id=eq.${hanaId}`, { method: 'PATCH', body: JSON.stringify({ welcome_claimed: true }) }), 'hana welcome flag')
  // [coupon, shop, % off, coins, days ago, VND paid]: used at five shops along her route
  const COUPONS = [
    ['c2', 'v2', 15, 95, 6, 118000], // Cafe Sen Xanh, Can Tho
    ['c9', 'v9', 15, 105, 4, 164000], // Sa Dec Flower Garden
    ['c10', 'v10', 10, 85, 2, 196000], // Chau Doc Mam Kitchen
    ['c14', 'v14', 20, 115, 1, 250000], // Sam Mountain Bike Tours
    ['c11', 'v11', 15, 130, 0, 180000], // Tra Su Forest Boat Rides
  ]
  const rows = []
  for (const [id, vendor, pct, cost, daysAgo, amount] of COUPONS) {
    const uid = `${id}-hana-${daysAgo}`
    await must(await rpc('apply_coins', { p_user: hanaId, p_delta: -cost, p_reason: 'coupon', p_ref: uid }), `hana buys ${id}`)
    const issued = at(daysAgo, 11) - 2 * 3600000
    rows.push({
      uid,
      user_id: hanaId,
      coupon_id: id,
      vendor_id: vendor,
      discount_pct: pct,
      source: 'coins',
      status: 'used',
      issued_at: new Date(issued).toISOString(),
      expires_at: new Date(issued + 7 * DAY).toISOString(),
      redeemed_at: new Date(Math.min(issued + 2 * 3600000, now - 10 * 60000)).toISOString(),
      amount_vnd: amount,
      commission_vnd: Math.round(amount * 0.05),
    })
  }
  // one coupon still to use, back in Can Tho: Green Bike Rental
  await must(await rpc('apply_coins', { p_user: hanaId, p_delta: -105, p_reason: 'coupon', p_ref: 'c6-hana-unused' }), 'hana buys c6')
  rows.push({
    uid: 'c6-hana-unused',
    user_id: hanaId,
    coupon_id: 'c6',
    vendor_id: 'v6',
    discount_pct: 20,
    source: 'coins',
    status: 'unused',
    issued_at: new Date(now - 2 * 3600000).toISOString(),
    expires_at: new Date(now + 6 * DAY).toISOString(),
    redeemed_at: null,
    amount_vnd: null,
    commission_vnd: null,
  })
  await must(await rest('coupons_issued', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) }), 'hana coupons')

  // her referral code, used by two of the background travelers (Rani's friends are demo.t1 and demo.t2)
  const codeRes = await rpc('get_referral_code', { p_user: hanaId })
  let code = ''
  if (codeRes.ok) {
    code = await codeRes.json()
    for (const [i, local] of ['demo.t3', 'demo.t4'].entries()) {
      const friend = existing.find((u) => u.email === `${local}${DOMAIN}`)
      if (!friend) continue
      const ref = await rpc('apply_referral', { p_user: friend.id, p_code: code, p_voucher_uid: `ref-hana-${i + 1}` })
      if (!ref.ok) console.warn(`referral ${local} skipped:`, (await ref.text()).slice(0, 120))
    }
  }
  console.log(`Hana ready: ${QUESTS.length} quests over 7 days, ${COUPONS.length} coupons used, referral code ${code || '(referral schema missing)'}`)
}

console.log(`demo accounts ready (password: ${process.env.DEMO_PASSWORD ? 'DEMO_PASSWORD' : PASSWORD})`)
