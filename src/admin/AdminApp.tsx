import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCatalog } from '../store/useCatalog'
import '../vendor/vendor.css'
import { adminApi } from './api'

// Internal tool for the Eco-Pet team (English only). Reviews quest photos the AI was not sure about,
// and shows how the verification is doing. Access needs accounts.role = 'admin' (set it in the
// Supabase Table Editor); the server checks that again on every request.

interface QueueItem {
  id: number
  user_id: string
  quest_id: string
  reason: string
  confidence: number | null
  red_flags: string[]
  ai_reason: string | null
  distance_m: number | null
  review_image: string | null
  reported_by_user?: boolean | null
  user_note?: string | null
  created_at: string
  quest: { id: string; rewardCoins: number; requiredObject?: string; requiredScene?: string; radiusM: number } | null
}
interface Attempt {
  id: number
  user_id: string
  quest_id: string
  outcome: string
  reason: string
  confidence: number | null
  red_flags: string[]
  distance_m: number | null
  review_status: string | null
  created_at: string
}
interface Stats {
  stats: Record<string, { n: number; avgConfidence: number | null }>
  reasons: Record<string, number>
  total: number
}

const REASON_TEXT: Record<string, string> = {
  low_confidence: 'AI unsure (confidence 0.5 – 0.7)',
  similar_photo: 'Looks like a photo another traveler already sent for this quest',
  not_detected: 'The AI said the photo does not match the quest',
  no_evidence: 'The AI said the photo shows no proof (the purchase, the bike or the boat)',
  suspicious: 'The AI said the photo looks edited or not taken by the traveler',
  screenshot: 'The AI said the photo looks like a screenshot',
}
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const tag = (id: string) => `#${id.slice(0, 4)}`

export default function AdminApp() {
  const [auth, setAuth] = useState<'loading' | 'signin' | 'denied' | 'ok'>('loading')
  const [tab, setTab] = useState<'queue' | 'attempts' | 'support' | 'referrals' | 'impact'>('queue')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const quests = useCatalog((s) => s.quests)

  const check = useCallback(async () => {
    if (!supabase) return setAuth('signin')
    const { data: sess } = await supabase.auth.getSession()
    const u = sess.session?.user
    if (!u) return setAuth('signin')
    const { data: acct } = await supabase.from('accounts').select('role').eq('id', u.id).maybeSingle()
    setAuth(acct?.role === 'admin' ? 'ok' : 'denied')
  }, [])

  useEffect(() => {
    void check()
    void useCatalog.getState().refresh()
  }, [check])

  const signIn = async () => {
    setMsg('')
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    if (error) return setMsg(error.message)
    await check()
  }

  const title = (id: string) => quests.find((q) => q.id === id)?.title.en ?? id

  return (
    <div className="v-app">
      <div className="v-main" style={{ margin: '0 auto' }}>
        <div className="v-head">
          <div>
            <h1>Eco-Pet admin: photo review</h1>
            <p className="v-sub">Check the quest photos the AI was not sure about, and see how verification is doing.</p>
          </div>
          {auth === 'ok' && (
            <button className="v-btn" onClick={() => void supabase?.auth.signOut().then(check)}>
              Sign out
            </button>
          )}
        </div>

        {auth === 'loading' && <p>Loading...</p>}
        {auth === 'signin' && (
          <section className="v-card" style={{ maxWidth: 420 }}>
            <h2>Sign in</h2>
            <div className="v-field">
              <label htmlFor="a-email">Email</label>
              <input id="a-email" className="v-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="v-field">
              <label htmlFor="a-pass">Password</label>
              <input id="a-pass" className="v-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void signIn()} />
            </div>
            {msg && <p className="v-error">{msg}</p>}
            <button className="v-btn primary" onClick={() => void signIn()}>
              Sign in
            </button>
          </section>
        )}
        {auth === 'denied' && (
          <section className="v-card">
            <p className="v-error">This account is not an admin. In Supabase, open Table Editor → accounts and set its role to admin.</p>
            <button className="v-btn" onClick={() => void supabase?.auth.signOut().then(check)}>
              Sign out
            </button>
          </section>
        )}

        {auth === 'ok' && (
          <>
            <div className="v-tabs" style={{ maxWidth: 760 }}>
              <button className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>
                Review queue
              </button>
              <button className={tab === 'attempts' ? 'active' : ''} onClick={() => setTab('attempts')}>
                Recent checks
              </button>
              <button className={tab === 'support' ? 'active' : ''} onClick={() => setTab('support')}>
                Customer service
              </button>
              <button className={tab === 'referrals' ? 'active' : ''} onClick={() => setTab('referrals')}>
                Referrals
              </button>
              <button className={tab === 'impact' ? 'active' : ''} onClick={() => setTab('impact')}>
                Impact
              </button>
            </div>
            {tab === 'queue' ? <Queue title={title} /> : tab === 'attempts' ? <Attempts title={title} /> : tab === 'support' ? <Support /> : tab === 'referrals' ? <Referrals /> : <Impact />}
          </>
        )}
      </div>
    </div>
  )
}

function Queue({ title }: { title: (id: string) => string }) {
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await adminApi('queue')
    if (r.ok) setItems(r.items as QueueItem[])
    else setError(r.error ?? 'error')
  }, [])
  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), 15000)
    return () => clearInterval(id)
  }, [load])

  const decide = async (id: number, decision: 'approve' | 'reject') => {
    setBusy(id)
    const r = await adminApi('decide', { id, decision, note: notes[id] ?? '' })
    setBusy(null)
    if (!r.ok && r.error !== 'already_decided') setError(r.error ?? 'error')
    await load()
  }

  if (error) return <p className="v-error">Could not load the queue ({error}). Is the review schema installed?</p>
  if (!items) return <p>Loading...</p>
  if (!items.length) return <p className="v-empty">Nothing is waiting for review.</p>

  return (
    <>
      {items.map((it) => (
        <section className="v-card" key={it.id}>
          <div className="v-two">
            <div>
              <img
                src={`data:image/jpeg;base64,${it.review_image}`}
                alt="Quest photo to review"
                style={{ width: '100%', maxHeight: 420, objectFit: 'contain', background: '#000', borderRadius: 10 }}
              />
            </div>
            <div>
              <h2>{title(it.quest_id)}</h2>
              <p className="v-hint">
                Needs: {it.quest?.requiredObject ?? it.quest?.requiredScene ?? '?'} · reward {it.quest?.rewardCoins ?? '?'} coins · sent {when(it.created_at)} · traveler {tag(it.user_id)}
              </p>
              {it.reported_by_user && (
                <p className="v-error" style={{ margin: '10px 0 0' }}>
                  <b>Reported by the traveler: they say the AI was wrong.</b>
                  {it.user_note ? ` Their note: "${it.user_note}"` : ''}
                </p>
              )}
              <p style={{ margin: '10px 0' }}>
                <b>{REASON_TEXT[it.reason] ?? it.reason}</b>
              </p>
              <ul className="v-list">
                <li>AI confidence: {it.confidence != null ? it.confidence.toFixed(2) : '?'}</li>
                <li>AI says: {it.ai_reason || '—'}</li>
                <li>Red flags: {it.red_flags.length ? it.red_flags.join(', ') : 'none'}</li>
                <li>Distance from the quest spot: {it.distance_m != null ? `${it.distance_m} m` : '?'} (allowed {it.quest?.radiusM ?? '?'} m)</li>
              </ul>
              <div className="v-field" style={{ marginTop: 12 }}>
                <label htmlFor={`n${it.id}`}>Note (optional, shown to the traveler if rejected)</label>
                <input id={`n${it.id}`} className="v-input" maxLength={200} value={notes[it.id] ?? ''} onChange={(e) => setNotes({ ...notes, [it.id]: e.target.value })} />
              </div>
              <div className="v-row">
                <button className="v-btn primary" disabled={busy === it.id} onClick={() => void decide(it.id, 'approve')}>
                  Approve (pay {it.quest?.rewardCoins ?? ''} coins)
                </button>
                <button className="v-btn" disabled={busy === it.id} onClick={() => void decide(it.id, 'reject')}>
                  Reject
                </button>
              </div>
              <p className="v-hint" style={{ marginTop: 8 }}>The photo is deleted as soon as you decide.</p>
            </div>
          </div>
        </section>
      ))}
    </>
  )
}

function Attempts({ title }: { title: (id: string) => string }) {
  const [rows, setRows] = useState<Attempt[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    void adminApi('attempts').then((r) => {
      if (r.ok) {
        setRows(r.items as Attempt[])
        setStats({ stats: r.stats as Stats['stats'], reasons: r.reasons as Stats['reasons'], total: Number(r.total) })
      }
    })
  }, [])
  if (!rows || !stats) return <p>Loading...</p>

  return (
    <>
      <div className="v-grid-tiles">
        <div className="v-tile">
          <div className="v-label">Checks, last 7 days</div>
          <div className="v-value">{stats.total}</div>
        </div>
        {(['verified', 'review', 'rejected'] as const).map((k) => (
          <div className="v-tile" key={k}>
            <div className="v-label">{k === 'review' ? 'Sent to review' : k[0].toUpperCase() + k.slice(1)}</div>
            <div className="v-value">{stats.stats[k]?.n ?? 0}</div>
            <div className="v-note">avg confidence {stats.stats[k]?.avgConfidence != null ? stats.stats[k].avgConfidence!.toFixed(2) : '—'}</div>
          </div>
        ))}
      </div>
      <section className="v-card">
        <h2>Why checks ended the way they did (7 days)</h2>
        <p className="v-hint">Use this to tune the thresholds: many &quot;low_confidence&quot; means the AI is often unsure; many &quot;not_detected&quot; with high confidence may mean the quests are too hard to photograph.</p>
        <ul className="v-list">
          {Object.entries(stats.reasons).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <li key={k}>
              {k}: {n}
            </li>
          ))}
        </ul>
      </section>
      <section className="v-card">
        <h2>Latest 100 checks</h2>
        <div className="v-table-scroll">
          <table className="v-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Quest</th>
                <th>Traveler</th>
                <th>Outcome</th>
                <th>Reason</th>
                <th className="v-num">Confidence</th>
                <th>Flags</th>
                <th className="v-num">Distance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{when(r.created_at)}</td>
                  <td>{title(r.quest_id)}</td>
                  <td>{tag(r.user_id)}</td>
                  <td>
                    <span className={`v-badge ${r.outcome === 'verified' ? 'used' : ''}`}>
                      {r.outcome}
                      {r.review_status ? ` (${r.review_status})` : ''}
                    </span>
                  </td>
                  <td>{r.reason}</td>
                  <td className="v-num">{r.confidence != null ? r.confidence.toFixed(2) : '—'}</td>
                  <td>{r.red_flags.join(', ') || '—'}</td>
                  <td className="v-num">{r.distance_m != null ? `${r.distance_m} m` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

interface Ticket {
  id: number
  user_id: string
  category: string
  coupon_uid: string | null
  message: string
  status: 'open' | 'resolved' | 'rejected'
  resolution: string | null
  refunded_coins: number | null
  admin_note: string | null
  created_at: string
  coupon: { status: string; source: string; expires_at: string | null } | null
  offer: { title_en: string; cost_coins: number } | null
  vendor: { name: string; plan_paid_until: string | null } | null
}

const CATEGORY_TEXT: Record<string, string> = {
  shop_closed: 'The shop was closed',
  shop_refused: 'The shop would not take the coupon',
  wrong_deal: 'The deal was not as described',
  coupon_problem: 'Another problem with a coupon',
  coins_problem: 'A problem with coins',
  other: 'Something else',
}

// The reports travelers send from Profile -> Customer service. For each one: what they said, the coupon and the shop, and three
// answers: coins back (a coupon bought with coins that is still unused), 7 more days on the coupon, or just a note.
function Support() {
  const [items, setItems] = useState<Ticket[] | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const r = await adminApi('tickets')
    if (r.ok) setItems(r.items as Ticket[])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const resolve = async (id: number, resolution: 'refund' | 'extend' | 'none') => {
    setBusy(id)
    setMsg('')
    const r = await adminApi('resolve_ticket', { id, resolution, note: notes[id] ?? '' })
    setBusy(null)
    if (!r.ok) {
      setMsg(r.error === 'already_decided' ? 'Someone already answered this report.' : r.error === 'not_refundable' ? 'This coupon cannot be refunded or extended (already used, bought for free, or gone).' : 'Could not save. Try again.')
    }
    await load()
  }

  if (!items) return <p>Loading...</p>
  const open = items.filter((x) => x.status === 'open')
  const done = items.filter((x) => x.status !== 'open')

  return (
    <>
      {msg && <p className="v-error">{msg}</p>}
      <section className="v-card">
        <h2>Waiting for an answer ({open.length})</h2>
        {open.length === 0 && <p className="v-hint">Nothing waiting.</p>}
      </section>
      {open.map((x) => {
        const unused = x.coupon?.status === 'unused'
        const canRefund = unused && x.coupon?.source === 'coins'
        return (
          <section className="v-card" key={x.id}>
            <h2>
              {CATEGORY_TEXT[x.category] ?? x.category} <span className="v-badge">{tag(x.user_id)}</span>
            </h2>
            <p className="v-hint">{when(x.created_at)}</p>
            <p style={{ whiteSpace: 'pre-line' }}>{x.message}</p>
            {x.coupon_uid && (
              <ul className="v-list">
                <li>Coupon: {x.offer?.title_en ?? '?'} ({x.offer ? `${x.offer.cost_coins} coins` : '?'})</li>
                <li>
                  Now: {x.coupon ? `${x.coupon.status}, ${x.coupon.source === 'coins' ? 'bought with coins' : 'free gift'}${x.coupon.expires_at ? `, expires ${when(x.coupon.expires_at)}` : ''}` : 'no longer in the traveler wallet'}
                </li>
                <li>
                  Shop: {x.vendor?.name ?? '?'}
                  {x.vendor?.plan_paid_until ? ` (plan paid until ${new Date(x.vendor.plan_paid_until).toLocaleDateString('en-GB')})` : ''}
                </li>
              </ul>
            )}
            <div className="v-field" style={{ marginTop: 12 }}>
              <label htmlFor={`sn${x.id}`}>Reply (shown to the traveler)</label>
              <input id={`sn${x.id}`} className="v-input" maxLength={300} value={notes[x.id] ?? ''} onChange={(e) => setNotes({ ...notes, [x.id]: e.target.value })} />
            </div>
            <div className="v-row">
              <button className="v-btn primary" disabled={busy === x.id || !canRefund} onClick={() => void resolve(x.id, 'refund')} title={canRefund ? '' : 'Only a coupon bought with coins that is still unused'}>
                Refund {x.offer ? `${x.offer.cost_coins} coins` : 'coins'}
              </button>
              <button className="v-btn" disabled={busy === x.id || !unused} onClick={() => void resolve(x.id, 'extend')} title={unused ? '' : 'Only an unused coupon'}>
                Add 7 days
              </button>
              <button className="v-btn" disabled={busy === x.id} onClick={() => void resolve(x.id, 'none')}>
                Close with a reply
              </button>
            </div>
          </section>
        )
      })}
      {done.length > 0 && (
        <section className="v-card">
          <h2>Answered</h2>
          <div className="v-table-scroll">
            <table className="v-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Traveler</th>
                  <th>About</th>
                  <th>Answer</th>
                  <th>Reply</th>
                </tr>
              </thead>
              <tbody>
                {done.map((x) => (
                  <tr key={x.id}>
                    <td>{when(x.created_at)}</td>
                    <td>{tag(x.user_id)}</td>
                    <td>{CATEGORY_TEXT[x.category] ?? x.category}</td>
                    <td>{x.resolution === 'refund' ? `Refunded ${x.refunded_coins ?? ''} coins` : x.resolution === 'extend' ? '+7 days' : 'Closed'}</td>
                    <td>{x.admin_note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

interface ReferralData {
  totals: { codes: number; used: number; bonusCoins: number; referrers: number }
  top: { id: string; name: string; n: number }[]
  items: { id: number; referrer_id: string; referred_id: string; referrer_name: string; referred_name: string; code: string; bonus_coins: number; voucher_uid: string | null; created_at: string }[]
}

// Referral codes: how many were made, how many were used, the bonus coins paid, who invites the most, and every referral.
function Referrals() {
  const [d, setD] = useState<ReferralData | null>(null)
  useEffect(() => {
    void adminApi('referrals').then((r) => r.ok && setD(r as unknown as ReferralData))
  }, [])
  if (!d) return <p>Loading...</p>
  return (
    <>
      <div className="v-grid-tiles">
        <div className="v-tile">
          <div className="v-label">Codes made</div>
          <div className="v-value">{d.totals.codes}</div>
        </div>
        <div className="v-tile">
          <div className="v-label">Times used</div>
          <div className="v-value">{d.totals.used}</div>
        </div>
        <div className="v-tile">
          <div className="v-label">Bonus coins paid</div>
          <div className="v-value">{d.totals.bonusCoins}</div>
        </div>
        <div className="v-tile">
          <div className="v-label">Travelers who invited</div>
          <div className="v-value">{d.totals.referrers}</div>
        </div>
      </div>
      <section className="v-card">
        <h2>Who invites the most</h2>
        {d.top.length === 0 ? (
          <p className="v-hint">No referral has been used yet.</p>
        ) : (
          <ul className="v-list">
            {d.top.map((x) => (
              <li key={x.id}>
                {x.name || tag(x.id)}: {x.n} {x.n === 1 ? 'friend' : 'friends'}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="v-card">
        <h2>Every referral</h2>
        <div className="v-table-scroll">
          <table className="v-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Code</th>
                <th>Invited by</th>
                <th>New traveler</th>
                <th className="v-num">Bonus</th>
                <th>Voucher for the inviter</th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((r) => (
                <tr key={r.id}>
                  <td>{when(r.created_at)}</td>
                  <td>{r.code}</td>
                  <td>{r.referrer_name || tag(r.referrer_id)}</td>
                  <td>{r.referred_name || tag(r.referred_id)}</td>
                  <td className="v-num">+{r.bonus_coins}</td>
                  <td>{r.voucher_uid ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

interface ImpactData {
  travelers: number
  questsDone: number
  busRides: number
  plasticFree: number
  localQuests: number
  outdoor: number
  couponsRedeemed: number
  localShopsReached: number
  couponsBySource: Record<string, number>
  origin: Record<string, number>
  destinations: [string, number][]
  kinds: [string, number][]
}

// What all the travelers together did for sustainability, and where they went in the Mekong Delta (counted from finished quests and used coupons).
function Impact() {
  const [d, setD] = useState<ImpactData | null>(null)
  useEffect(() => {
    void adminApi('impact').then((r) => r.ok && setD(r as unknown as ImpactData))
  }, [])
  if (!d) return <p>Loading...</p>
  const tiles: [string, number, string][] = [
    ['Active travelers', d.travelers, 'finished at least one quest'],
    ['Quests finished', d.questsDone, 'all quests'],
    ['Bus rides', d.busRides, 'a bus instead of a private vehicle'],
    ['Plastic-free moments', d.plasticFree, 'own bottle or own utensils'],
    ['Local-business quests', d.localQuests, 'markets, workshops, orchards, family eateries'],
    ['On foot, bike or oar', d.outdoor, 'hiking, cycling, hand-rowed boat'],
    ['Coupons used', d.couponsRedeemed, `at ${d.localShopsReached} local shops`],
  ]
  return (
    <>
      <div className="v-grid-tiles">
        {tiles.map(([label, n, note]) => (
          <div className="v-tile" key={label}>
            <div className="v-label">{label}</div>
            <div className="v-value">{n}</div>
            <div className="v-note">{note}</div>
          </div>
        ))}
      </div>
      <section className="v-card">
        <h2>Where travelers went (finished quests per place)</h2>
        <ul className="v-list">
          {d.destinations.length === 0 && <li>No data yet.</li>}
          {d.destinations.map(([place, n]) => (
            <li key={place}>
              {place}: {n}
            </li>
          ))}
        </ul>
      </section>
      <section className="v-card">
        <h2>What travelers like to do (by kind of quest)</h2>
        <ul className="v-list">
          {d.kinds.map(([k, n]) => (
            <li key={k}>
              {k.replace(/_/g, ' ')}: {n}
            </li>
          ))}
        </ul>
      </section>
      <section className="v-card">
        <h2>Travelers and coupons</h2>
        <ul className="v-list">
          {Object.entries(d.origin).map(([k, n]) => (
            <li key={k}>
              {k === 'domestic' ? 'Domestic travelers' : k === 'international' ? 'International travelers' : 'Traveler type not known'}: {n}
            </li>
          ))}
          {Object.entries(d.couponsBySource).map(([k, n]) => (
            <li key={k}>
              Coupons from {k === 'coins' ? 'coins' : k === 'welcome' ? 'the welcome gift' : 'referrals'}: {n}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
