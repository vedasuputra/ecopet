import { PLACES } from '../data/places'
import { useAppStore } from '../store/useAppStore'
import { useLocation } from '../store/useLocation'

export default function DevPanel() {
  const { reset, addCoins, coins, commissionEvents } = useAppStore()
  const { placeName, lat, lng, setSimulated } = useLocation()
  return (
    <div>
      <h2>Dev panel</h2>
      <p>Coins: {coins}</p>
      <button onClick={() => addCoins(100)}>+100 coins</button>
      <button
        onClick={() => {
          if (confirm('Reset all demo data?')) reset()
        }}
      >
        Reset demo
      </button>
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
      <h3>Commission</h3>
      <p>
        {commissionEvents.length} events, total VND{' '}
        {commissionEvents.reduce((a, e) => a + e.commissionVnd, 0).toLocaleString('en-US')}
      </p>
    </div>
  )
}
