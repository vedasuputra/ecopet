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

console.log(`demo accounts ready (password: ${process.env.DEMO_PASSWORD ? 'DEMO_PASSWORD' : PASSWORD})`)
