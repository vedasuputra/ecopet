import { useState } from 'react'
import { buildDemoState } from '../data/demoState'
import { PLACES } from '../data/places'
import { devAction } from '../store/economy'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

// Hidden developer tools. Coins now live on the server, so these call /api/economy, which only
// allows them for @ecopet.demo accounts (or any account if the server sets ALLOW_DEV_ECONOMY=1).
export default function DevPanel() {
  const { coins, user, reset } = useAppStore()
  const { placeName, lat, lng, setSimulated } = useLocation()
  const [msg, setMsg] = useState('')

  const run = async (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setMsg(`${label}...`)
    const r = await fn()
    setMsg(r.ok ? `${label}: done` : r.error === 'dev_disabled' ? 'Dev tools are turned off for this account (use a @ecopet.demo account, or set ALLOW_DEV_ECONOMY=1 on the server).' : `${label} failed: ${r.error}`)
  }

  return (
    <div>
      <h2>Dev panel</h2>
      <p>Coins: {coins}</p>
      <button onClick={() => run('+100 coins', () => devAction('dev_grant', { amount: 100 }))}>+100 coins</button>
      <button
        onClick={() => {
          if (!confirm('Load the demo trip (coins, quests, a coupon) into this account?')) return
          void run('Load demo progress', async () => {
            const r = await devAction('dev_demo')
            if (r.ok) useAppStore.setState(buildDemoState(user?.name ?? 'Linh'))
            return r
          })
        }}
      >
        Load demo progress
      </button>
      <button
        onClick={() => {
          if (!confirm('Reset all progress (coins, quests, coupons) for this account?')) return
          void run('Reset progress', async () => {
            const r = await devAction('dev_reset')
            if (r.ok) reset()
            return r
          })
        }}
      >
        Reset progress
      </button>
      {msg && <p>{msg}</p>}
      <h3>
        Location (simulated): {placeName} ({lat.toFixed(4)}, {lng.toFixed(4)})
      </h3>
      {PLACES.map((p) => (
        <button key={p.name} onClick={() => setSimulated(p.lat, p.lng, p.name)}>
          {p.name}
        </button>
      ))}
      <h3>Vendor dashboard</h3>
      <p>
        <a href="/vendor" target="_blank" rel="noreferrer">
          Open /vendor in a new tab
        </a>
      </p>
    </div>
  )
}
