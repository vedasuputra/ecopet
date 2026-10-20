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
  const [tab, setTab] = useState<'queue' | 'attempts'>('queue')
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
            <div className="v-tabs" style={{ maxWidth: 360 }}>
              <button className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>
                Review queue
              </button>
              <button className={tab === 'attempts' ? 'active' : ''} onClick={() => setTab('attempts')}>
                Recent checks
              </button>
            </div>
            {tab === 'queue' ? <Queue title={title} /> : <Attempts title={title} />}
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
